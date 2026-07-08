const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  CREATE_REPORT: 1,
  ADD_SERIES: 2,
  SET_STUDY_AND_SERIES: 3,
};

export const measurementTrackingMode = {
  STANDARD: 'standard',
  SIMPLIFIED: 'simplified',
  NONE: 'none',
};

function promptBeginTracking({ extensionManager }, ctx, evt) {
  const appConfig = extensionManager._appConfig;
  // When the state change happens after a promise, the state machine sends the retult in evt.data;
  // In case of direct transition to the state, the state machine sends the data in evt;
  const { viewportId, StudyInstanceUID, SeriesInstanceUID } = evt.data || evt;

  return new Promise(async function (resolve, reject) {
    const noTrackingMode = appConfig?.measurementTrackingMode === measurementTrackingMode.NONE;
    let promptResult;

    promptResult = noTrackingMode ? RESPONSE.NO_NEVER : RESPONSE.SET_STUDY_AND_SERIES;

    resolve({
      userResponse: promptResult,
      StudyInstanceUID,
      SeriesInstanceUID,
      viewportId,
    });
  });
}

export default promptBeginTracking;
