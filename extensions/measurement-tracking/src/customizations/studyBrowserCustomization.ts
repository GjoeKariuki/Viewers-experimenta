import { measurementTrackingMode } from '../contexts/TrackedMeasurementsContext/promptBeginTracking';

const PROJECTION_PROTOCOL_IDS = ['mpr', 'mip', 'mipAndMpr'];
const PROJECTION_RESET_WAIT_FRAMES = 20;

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

function getViewportIdAfterReset(viewportGridService, previousViewportId) {
  const { activeViewportId, viewports } = viewportGridService.getState();
  const viewportIds = Array.from(viewports?.keys?.() ?? []);

  if (!viewportIds.length) {
    return undefined;
  }

  if (
    activeViewportId &&
    activeViewportId !== previousViewportId &&
    viewports?.has(activeViewportId)
  ) {
    return activeViewportId;
  }

  return viewportIds.find(viewportId => viewportId !== previousViewportId);
}

async function waitForViewportIdAfterReset(viewportGridService, previousViewportId) {
  for (let i = 0; i < PROJECTION_RESET_WAIT_FRAMES; i++) {
    const viewportId = getViewportIdAfterReset(viewportGridService, previousViewportId);
    if (viewportId && viewportId !== previousViewportId) {
      return viewportId;
    }

    await waitForNextFrame();
  }

  return undefined;
}

async function getUpdatedViewportsForDisplaySet({
  activeViewportId,
  displaySetInstanceUID,
  servicesManager,
  commandsManager,
  isHangingProtocolLayout,
}) {
  const { displaySetService, hangingProtocolService, viewportGridService } = servicesManager.services;
  const protocolId = hangingProtocolService.getState()?.protocolId;
  const currentViewportDisplaySetInstanceUID =
    viewportGridService.getState().viewports?.get(activeViewportId)?.displaySetInstanceUIDs?.[0];

  if (
    PROJECTION_PROTOCOL_IDS.includes(protocolId) &&
    currentViewportDisplaySetInstanceUID !== displaySetInstanceUID
  ) {
    const studyInstanceUID = displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;
    const didReset = commandsManager.run('setHangingProtocol', {
      protocolId: 'default',
      StudyInstanceUID: studyInstanceUID,
      reset: true,
    });

    if (didReset === false) {
      throw new Error('Failed to reset hanging protocol before loading unsupported display set.');
    }

    const viewportIdToUse = await waitForViewportIdAfterReset(viewportGridService, activeViewportId);
    return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
  }

  let updatedViewports = [];

  try {
    updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
      activeViewportId,
      displaySetInstanceUID,
      isHangingProtocolLayout
    );
  } catch (error) {
    console.warn(error);

    const studyInstanceUID = displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;
    const didReset = commandsManager.run('setHangingProtocol', {
      protocolId: 'default',
      StudyInstanceUID: studyInstanceUID,
      reset: true,
    });

    if (didReset === false) {
      return buildFallbackViewportUpdate(activeViewportId, displaySetInstanceUID);
    }

    const viewportIdToUse = await waitForViewportIdAfterReset(viewportGridService, activeViewportId);
    try {
      updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
        viewportIdToUse,
        displaySetInstanceUID,
        viewportGridService.getState().isHangingProtocolLayout
      );
    } catch (retryError) {
      console.warn(retryError);
      return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
    }
  }

  return updatedViewports;
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
              isHangingProtocolLayout
            });
            servicesManager.services.viewportGridService.setDisplaySetsForViewports(updatedViewports);
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
