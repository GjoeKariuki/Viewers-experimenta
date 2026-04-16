import { utils } from '@ohif/core';
import i18n from '@ohif/i18n';
const { formatDate } = utils;

function getUpdatedViewportsForDisplaySet({
  activeViewportId,
  displaySetInstanceUID,
  servicesManager,
  commandsManager,
  isHangingProtocolLayout,
}) {
  const { displaySetService, hangingProtocolService, viewportGridService } = servicesManager.services;

  try {
    return hangingProtocolService.getViewportsRequireUpdate(
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
      throw error;
    }

    return hangingProtocolService.getViewportsRequireUpdate(
      activeViewportId,
      displaySetInstanceUID,
      viewportGridService.getState().isHangingProtocolLayout
    );
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

          commandsManager.run('setDisplaySetsForViewports', {
            viewportsToUpdate: updatedViewports,
          });
        },
    ],
  },
};
