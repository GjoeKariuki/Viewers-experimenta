import { utils } from '@ohif/core';
import i18n from '@ohif/i18n';
const { formatDate } = utils;

const PROJECTION_PROTOCOL_IDS = ['mpr', 'mip', 'mipAndMpr'];

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

function buildFallbackViewportUpdate(viewportGridService, viewportId, displaySetInstanceUID) {
  const { viewports } = viewportGridService.getState();
  const viewport = viewports?.get(viewportId);

  if (!viewportId) {
    return [];
  }

  return [
    {
      viewportId,
      displaySetInstanceUIDs: [displaySetInstanceUID],
      viewportOptions: viewport?.viewportOptions,
      displaySetOptions: viewport?.displaySetOptions,
    },
  ];
}

function getUpdatedViewportsForDisplaySet({
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

    viewportIdToUse = getSafeActiveViewportId(viewportGridService, activeViewportId);

    try {
      return getRequiredViewports();
    } catch (projectionRetryError) {
      console.warn(projectionRetryError);
      return buildFallbackViewportUpdate(viewportGridService, viewportIdToUse, displaySetInstanceUID);
    }
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

    viewportIdToUse = getSafeActiveViewportId(viewportGridService, activeViewportId);

    try {
      return getRequiredViewports();
    } catch (retryError) {
      console.warn(retryError);
      return buildFallbackViewportUpdate(viewportGridService, viewportIdToUse, displaySetInstanceUID);
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
          const { hangingProtocolService, uiNotificationService } = servicesManager.services;
          let updatedViewports = [];
          const viewportId = activeViewportId;

          try {
            updatedViewports = getUpdatedViewportsForDisplaySet({
              activeViewportId: viewportId,
              displaySetInstanceUID,
              servicesManager,
              commandsManager,
              isHangingProtocolLayout,
            });
          } catch (error) {
            console.warn(error);
            uiNotificationService.show({
              title: i18n.t('StudyBrowser:Thumbnail Double Click'),
              message: i18n.t(
                'StudyBrowser:The selected series could not use the current layout, so the viewer was reset before loading it.'
              ),
              type: 'error',
              duration: 3000,
            });
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
