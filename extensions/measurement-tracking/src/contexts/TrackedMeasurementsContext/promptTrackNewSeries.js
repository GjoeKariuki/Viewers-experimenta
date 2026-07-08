import { measurementTrackingMode } from './promptBeginTracking';

const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  CREATE_REPORT: 1,
  ADD_SERIES: 2,
  SET_STUDY_AND_SERIES: 3,
  NO_NOT_FOR_SERIES: 4,
};

function promptTrackNewSeries({ extensionManager }, ctx, evt) {
  // When the state change happens after a promise, the state machine sends the retult in evt.data;
  // In case of direct transition to the state, the state machine sends the data in evt;
  const { viewportId, StudyInstanceUID, SeriesInstanceUID } = evt.data || evt;

  return new Promise(async function (resolve, reject) {
    const appConfig = extensionManager._appConfig;

    let promptResult =
      appConfig?.measurementTrackingMode === measurementTrackingMode.NONE
        ? RESPONSE.CANCEL
        : RESPONSE.ADD_SERIES;

    resolve({
      userResponse: promptResult,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
      isBackupSave: false,
    });
  });
}

export default promptTrackNewSeries;
