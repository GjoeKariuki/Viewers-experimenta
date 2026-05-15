import { measurementTrackingMode } from '../contexts/TrackedMeasurementsContext/promptBeginTracking';

const DEFAULT_PROTOCOL_ID = 'default';
const PROJECTION_RESET_WAIT_FRAMES = 5;
const RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES = ['volume', 'volume3d'];

function waitForNextFrame() {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => resolve(undefined));
  });
}

function buildFallbackViewportUpdate(viewportId, displaySetInstanceUID) {
  if (!viewportId) {
    return [];
  }

  return [
    {
      viewportId,
      displaySetInstanceUIDs: [displaySetInstanceUID],
    },
  ];
}

function normalizeViewportUpdates(
  viewportsToUpdate,
  viewportGridService,
  fallbackViewportId,
  displaySetInstanceUID
) {
  const { viewports } = viewportGridService.getState();

  if (
    Array.isArray(viewportsToUpdate) &&
    viewportsToUpdate.length > 0 &&
    viewportsToUpdate.every(viewport => viewport?.viewportId && viewports?.has(viewport.viewportId))
  ) {
    return viewportsToUpdate;
  }

  return buildFallbackViewportUpdate(fallbackViewportId, displaySetInstanceUID);
}

function getSafeActiveViewportId(viewportGridService, fallbackViewportId) {
  const { activeViewportId, viewports } = viewportGridService.getState();

  if (activeViewportId && viewports?.has(activeViewportId)) {
    return activeViewportId;
  }

  if (fallbackViewportId && viewports?.has(fallbackViewportId)) {
    return fallbackViewportId;
  }

  return viewports?.keys?.().next?.().value;
}

function getProtocolViewportIds(hangingProtocolService, protocolId = DEFAULT_PROTOCOL_ID) {
  try {
    const protocol = hangingProtocolService.getProtocolById(protocolId);
    const stage = protocol?.stages?.[0];

    return (stage?.viewports || [])
      .map(viewport => viewport?.viewportOptions?.viewportId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function shouldResetToDefaultBeforeLoadingDisplaySet(hangingProtocolService, protocolId) {
  if (!protocolId || protocolId === DEFAULT_PROTOCOL_ID) {
    return false;
  }

  try {
    const protocol = hangingProtocolService.getProtocolById(protocolId);
    const viewportOptions = [
      protocol?.defaultViewport?.viewportOptions,
      ...(protocol?.stages || []).flatMap(stage =>
        (stage?.viewports || []).map(viewport => viewport?.viewportOptions)
      ),
    ];

    return viewportOptions.some(viewportOptions =>
      RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES.includes(viewportOptions?.viewportType)
    );
  } catch {
    return false;
  }
}

function isVolumeRenderingViewport(viewport) {
  return RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES.includes(viewport?.viewportOptions?.viewportType);
}

function getViewportIdAfterReset(viewportGridService, targetViewportIds = []) {
  const { activeViewportId, viewports } = viewportGridService.getState();
  const viewportIds = Array.from(viewports?.keys?.() ?? []);

  if (!viewportIds.length) {
    return undefined;
  }

  const candidateViewportIds = (targetViewportIds.length ? targetViewportIds : viewportIds).filter(
    viewportId => {
      const viewport = viewports?.get(viewportId);

      return viewport && !isVolumeRenderingViewport(viewport);
    }
  );

  if (activeViewportId && candidateViewportIds.includes(activeViewportId)) {
    return activeViewportId;
  }

  if (candidateViewportIds.length) {
    return candidateViewportIds[0];
  }

  if (activeViewportId && !isVolumeRenderingViewport(viewports?.get(activeViewportId))) {
    return activeViewportId;
  }

  return viewportIds.find(viewportId => !isVolumeRenderingViewport(viewports?.get(viewportId)));
}

async function waitForViewportIdAfterReset(
  viewportGridService,
  hangingProtocolService,
  targetProtocolId = DEFAULT_PROTOCOL_ID
) {
  const targetViewportIds = getProtocolViewportIds(hangingProtocolService, targetProtocolId);

  for (let i = 0; i < PROJECTION_RESET_WAIT_FRAMES; i++) {
    const viewportId = getViewportIdAfterReset(viewportGridService, targetViewportIds);
    if (viewportId) {
      return viewportId;
    }

    await waitForNextFrame();
  }

  return getViewportIdAfterReset(viewportGridService, targetViewportIds);
}

async function getUpdatedViewportsForDisplaySet({
  activeViewportId,
  displaySetInstanceUID,
  servicesManager,
  commandsManager,
  isHangingProtocolLayout,
}) {
  const { displaySetService, hangingProtocolService, viewportGridService } =
    servicesManager.services;
  const protocolId = hangingProtocolService.getState()?.protocolId;
  let viewportIdToUse = getSafeActiveViewportId(viewportGridService, activeViewportId);
  const currentViewportDisplaySetInstanceUID = viewportGridService
    .getState()
    .viewports?.get(viewportIdToUse)?.displaySetInstanceUIDs?.[0];

  const getRequiredViewports = () =>
    hangingProtocolService.getViewportsRequireUpdate(
      viewportIdToUse,
      displaySetInstanceUID,
      viewportGridService.getState().isHangingProtocolLayout
    );

  if (
    shouldResetToDefaultBeforeLoadingDisplaySet(hangingProtocolService, protocolId) &&
    currentViewportDisplaySetInstanceUID !== displaySetInstanceUID
  ) {
    const studyInstanceUID =
      displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;
    const didReset = commandsManager.run('setHangingProtocol', {
      protocolId: DEFAULT_PROTOCOL_ID,
      StudyInstanceUID: studyInstanceUID,
      reset: true,
    });

    if (didReset === false) {
      throw new Error('Failed to reset hanging protocol before loading unsupported display set.');
    }

    viewportIdToUse = await waitForViewportIdAfterReset(
      viewportGridService,
      hangingProtocolService
    );

    try {
      return getRequiredViewports();
    } catch (error) {
      console.warn(error);
      return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
    }
  }

  try {
    return normalizeViewportUpdates(
      getRequiredViewports(),
      viewportGridService,
      viewportIdToUse,
      displaySetInstanceUID
    );
  } catch (error) {
    console.warn(error);

    const studyInstanceUID =
      displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;
    const didReset = commandsManager.run('setHangingProtocol', {
      protocolId: DEFAULT_PROTOCOL_ID,
      StudyInstanceUID: studyInstanceUID,
      reset: true,
    });

    if (didReset === false) {
      return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
    }

    viewportIdToUse = await waitForViewportIdAfterReset(
      viewportGridService,
      hangingProtocolService
    );
    try {
      return normalizeViewportUpdates(
        getRequiredViewports(),
        viewportGridService,
        viewportIdToUse,
        displaySetInstanceUID
      );
    } catch (retryError) {
      console.warn(retryError);
      return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
    }
  }
}

type CheckHasDirtyAndSimplifiedModeProps = {
  servicesManager: AppTypes.ServicesManager;
  appConfig: AppTypes.Config;
  displaySetInstanceUID: string;
};

const onDoubleClickHandler = {
  callbacks: [
    ({ activeViewportId, servicesManager, commandsManager, isHangingProtocolLayout, appConfig }) =>
      async displaySetInstanceUID => {
        const haveDirtyMeasurementsInSimplifiedMode = checkHasDirtyAndSimplifiedMode({
          servicesManager,
          appConfig,
          displaySetInstanceUID,
        });

        try {
          if (!haveDirtyMeasurementsInSimplifiedMode) {
            const updatedViewports = await getUpdatedViewportsForDisplaySet({
              activeViewportId,
              displaySetInstanceUID,
              servicesManager,
              commandsManager,
              isHangingProtocolLayout,
            });
            servicesManager.services.viewportGridService.setDisplaySetsForViewports(
              updatedViewports
            );
          }
        } catch (error) {
          console.warn(error);
        }
      },
  ],
};

const customOnDropHandlerCallback = async props => {
  const handled = checkHasDirtyAndSimplifiedMode(props);
  return Promise.resolve({ handled });
};

const checkHasDirtyAndSimplifiedMode = (props: CheckHasDirtyAndSimplifiedModeProps) => {
  const { servicesManager, appConfig, displaySetInstanceUID } = props;
  const simplifiedMode = appConfig.measurementTrackingMode === measurementTrackingMode.SIMPLIFIED;
  const { measurementService, displaySetService } = servicesManager.services;
  const measurements = measurementService.getMeasurements();
  const haveDirtyMeasurements =
    measurements.some(m => m.isDirty) ||
    (measurements.length && measurementService.getIsMeasurementDeletedIndividually());
  const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
  return displaySet.Modality === 'SR' && simplifiedMode && haveDirtyMeasurements;
};

export { onDoubleClickHandler, customOnDropHandlerCallback };
