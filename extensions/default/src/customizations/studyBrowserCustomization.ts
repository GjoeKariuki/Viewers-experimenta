import { utils } from '@ohif/core';
import i18n from '@ohif/i18n';
const { formatDate } = utils;

const PROJECTION_PROTOCOL_IDS = ['mpr', 'mip', 'mipAndMpr'];
const PROJECTION_RESET_WAIT_FRAMES = 5;

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

function getActiveViewportDisplaySetInstanceUID(viewportGridService, viewportId) {
  const { viewports } = viewportGridService.getState();
  const activeViewport = viewports?.get(viewportId);
  return activeViewport?.displaySetInstanceUIDs?.[0];
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

function waitForNextFrame() {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => resolve(undefined));
  });
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
  let viewportIdToUse = getSafeActiveViewportId(viewportGridService, activeViewportId);
  const currentViewportDisplaySetInstanceUID = getActiveViewportDisplaySetInstanceUID(
    viewportGridService,
    viewportIdToUse
  );

  const getRequiredViewports = () =>
    hangingProtocolService.getViewportsRequireUpdate(
      viewportIdToUse,
      displaySetInstanceUID,
      viewportGridService.getState().isHangingProtocolLayout
    );

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

    viewportIdToUse = await waitForViewportIdAfterReset(viewportGridService, viewportIdToUse);
    return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
  }

  try {
    return getRequiredViewports();
  } catch (error) {
    console.warn(error);

    const studyInstanceUID = displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;
    const didReset = commandsManager.run('setHangingProtocol', {
      protocolId: 'default',
      StudyInstanceUID: studyInstanceUID,
      reset: true,
    });

    if (didReset === false) {
      throw error;
    }

    viewportIdToUse = await waitForViewportIdAfterReset(viewportGridService, viewportIdToUse);

    try {
      return getRequiredViewports();
    } catch (retryError) {
      console.warn(retryError);
      return buildFallbackViewportUpdate(viewportIdToUse, displaySetInstanceUID);
    }
  }
}

export default {
  'studyBrowser.studyMenuItems': [],
  'studyBrowser.thumbnailMenuItems': [
    {
      id: 'tagBrowser',
      label: i18n.t('StudyBrowser:Tag Browser'),
      iconName: 'DicomTagBrowser',
      commands: 'openDICOMTagViewer',
    },
    {
      id: 'addAsLayer',
      label: i18n.t('StudyBrowser:Add as Layer'),
      iconName: 'ViewportViews',
      commands: 'addDisplaySetAsLayer',
    },
  ],
  'studyBrowser.sortFunctions': [
    {
      label: i18n.t('StudyBrowser:Series Number'),
      sortFunction: (a, b) => {
        return a?.SeriesNumber - b?.SeriesNumber;
      },
    },
    {
      label: i18n.t('StudyBrowser:Series Date'),
      sortFunction: (a, b) => {
        const dateA = new Date(formatDate(a?.SeriesDate));
        const dateB = new Date(formatDate(b?.SeriesDate));
        return dateB.getTime() - dateA.getTime();
      },
    },
  ],
  'studyBrowser.viewPresets': [
    {
      id: 'list',
      iconName: 'ListView',
      selected: false,
    },
    {
      id: 'thumbnails',
      iconName: 'ThumbnailView',
      selected: true,
    },
  ],
  'studyBrowser.studyMode': 'all',
  'studyBrowser.thumbnailDoubleClickCallback': {
    callbacks: [
      ({ activeViewportId, servicesManager, commandsManager, isHangingProtocolLayout }) =>
        async displaySetInstanceUID => {
          let updatedViewports = [];
          const viewportId = activeViewportId;

          try {
            updatedViewports = await getUpdatedViewportsForDisplaySet({
              activeViewportId: viewportId,
              displaySetInstanceUID,
              servicesManager,
              commandsManager,
              isHangingProtocolLayout,
            });
          } catch (error) {
            console.warn(error);
          }

          if (updatedViewports.length) {
            commandsManager.run('setDisplaySetsForViewports', {
              viewportsToUpdate: updatedViewports,
            });
          }
        },
    ],
  },
};
