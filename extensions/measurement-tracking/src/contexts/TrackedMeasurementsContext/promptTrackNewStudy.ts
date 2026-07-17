import { measurementTrackingMode } from './promptBeginTracking';

const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  CREATE_REPORT: 1,
  ADD_SERIES: 2,
  SET_STUDY_AND_SERIES: 3,
  NO_NOT_FOR_SERIES: 4,
};

function promptTrackNewStudy({ servicesManager, extensionManager }: withAppTypes, ctx, evt) {
  const { uiViewportDialogService, customizationService } = servicesManager.services;
  // When the state change happens after a promise, the state machine sends the retult in evt.data;
  // In case of direct transition to the state, the state machine sends the data in evt;
  const { viewportId, StudyInstanceUID, SeriesInstanceUID } = evt.data || evt;

  return new Promise(async function (resolve, reject) {
    const appConfig = extensionManager._appConfig;

    const noTrackingMode = appConfig?.measurementTrackingMode === measurementTrackingMode.NONE;
    const promptResult = noTrackingMode
      ? RESPONSE.NO_NOT_FOR_SERIES
      : ctx.isDirty
        ? await _askSaveDiscardOrCancel(uiViewportDialogService, customizationService, viewportId)
        : RESPONSE.SET_STUDY_AND_SERIES;

    resolve({
      userResponse: promptResult,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
      isBackupSave: false,
    });
  });
}

function _askSaveDiscardOrCancel(
  UIViewportDialogService: AppTypes.UIViewportDialogService,
  customizationService: AppTypes.CustomizationService,
  viewportId
) {
  return new Promise(function (resolve, reject) {
    const message = customizationService.getCustomization(
      'viewportNotification.discardStudyMessage'
    );
    const actions = [
      { type: 'cancel', text: 'Cancel', value: RESPONSE.CANCEL },
      {
        type: 'secondary',
        text: 'No, discard previously tracked series & measurements',
        value: RESPONSE.SET_STUDY_AND_SERIES,
      },
      {
        type: 'primary',
        text: 'Yes',
        value: RESPONSE.CREATE_REPORT,
      },
    ];
    const onSubmit = result => {
      UIViewportDialogService.hide();
      resolve(result);
    };

    UIViewportDialogService.show({
      viewportId,
      type: 'warning',
      message,
      actions,
      onSubmit,
      onOutsideClick: () => {
        UIViewportDialogService.hide();
        resolve(RESPONSE.CANCEL);
      },
    });
  });
}

export default promptTrackNewStudy;
