import { DicomMetadataStore, log, utils, Enums } from '@ohif/core';
import { getShouldUseCPURendering } from '@cornerstonejs/core';
import getStudies from './studiesList';
import isSeriesFilterUsed from '../../utils/isSeriesFilterUsed';

const { seriesSortCriteria, getSplitParam } = utils;

const protocolRequiresGPU = protocol => {
  const viewportOptions = [
    protocol?.defaultViewport?.viewportOptions,
    ...(protocol?.stages || []).flatMap(stage =>
      (stage?.viewports || []).map(viewport => viewport?.viewportOptions)
    ),
  ];

  return viewportOptions.some(viewportOptions =>
    ['volume', 'volume3d'].includes(viewportOptions?.viewportType)
  );
};

function getSeriesPromiseUID(seriesPromise) {
  return seriesPromise?.metadata?.SeriesInstanceUID || seriesPromise?.metadata?.seriesInstanceUID;
}

function splitSeriesPromisesByUID(seriesPromises, seriesInstanceUIDs = []) {
  if (!seriesInstanceUIDs?.length) {
    return {
      requiredSeries: seriesPromises,
      remaining: [],
    };
  }

  const requestedSeries = new Set(seriesInstanceUIDs);
  const requiredSeries = [];
  const remaining = [];

  seriesPromises.forEach(seriesPromise => {
    const seriesInstanceUID = getSeriesPromiseUID(seriesPromise);

    if (seriesInstanceUID && requestedSeries.has(seriesInstanceUID)) {
      requiredSeries.push(seriesPromise);
      return;
    }

    remaining.push(seriesPromise);
  });

  if (!requiredSeries.length) {
    return {
      requiredSeries: seriesPromises,
      remaining: [],
    };
  }

  return {
    requiredSeries,
    remaining,
  };
}

/**
 * Initialize the route.
 *
 * @param props.servicesManager to read services from
 * @param props.studyInstanceUIDs for a list of studies to read
 * @param props.dataSource to read the data from
 * @param props.filters filters from query params to read the data from
 * @returns array of subscriptions to cancel
 */
export async function defaultRouteInit(
  {
    servicesManager,
    studyInstanceUIDs,
    dataSource,
    filters,
  }: withAppTypes & { studyInstanceUIDs?: string[] },
  hangingProtocolId,
  stageIndex
) {
  const { displaySetService, hangingProtocolService, uiNotificationService, customizationService } =
    servicesManager.services;
  /**
   * Function to apply the hanging protocol when the minimum number of display sets were
   * received or all display sets retrieval were completed
   * @returns
   */
  function applyHangingProtocol() {
    const displaySets = displaySetService.getActiveDisplaySets();
    // The display sets are not necessarily in load order, even though the
    // series got started in load order, so re-sort them before hanging
    const sortCriteria = seriesSortCriteria.default;

    if (!displaySets || !displaySets.length) {
      return;
    }
    const sortedDisplaySets = [...displaySets].sort(sortCriteria);

    // Gets the studies list to use
    const studies = getStudies(studyInstanceUIDs, sortedDisplaySets);

    // study being displayed, and is thus the "active" study.
    const activeStudy = studies[0];

    let protocolIdToApply = hangingProtocolId;
    let stageIndexToApply = stageIndex;

    if (protocolIdToApply && getShouldUseCPURendering()) {
      try {
        const protocol = hangingProtocolService.getProtocolById(protocolIdToApply);
        if (protocolRequiresGPU(protocol)) {
          uiNotificationService.show({
            title: 'GPU Rendering Required',
            message: `${protocol?.name || protocolIdToApply} requires GPU rendering and cannot be applied while CPU rendering is enabled.`,
            type: 'info',
            duration: 3000,
          });
          protocolIdToApply = 'default';
          stageIndexToApply = undefined;
        }
      } catch (error) {
        console.warn('Unable to validate hanging protocol for CPU rendering', error);
      }
    }

    // run the hanging protocol matching on the displaySets with the predefined
    // hanging protocol in the mode configuration
    hangingProtocolService.run({ studies, activeStudy, displaySets }, protocolIdToApply, {
      stageIndex: stageIndexToApply,
    });
  }

  const unsubscriptions = [];
  const issuedWarningSeries = [];
  const { unsubscribe: instanceAddedUnsubscribe } = DicomMetadataStore.subscribe(
    DicomMetadataStore.EVENTS.INSTANCES_ADDED,
    function ({ StudyInstanceUID, SeriesInstanceUID, madeInClient = false }) {
      const seriesMetadata = DicomMetadataStore.getSeries(StudyInstanceUID, SeriesInstanceUID);

      // checks if the series filter was used, if it exists
      const seriesInstanceUIDs = filters?.seriesInstanceUID;
      if (
        seriesInstanceUIDs?.length &&
        !isSeriesFilterUsed(seriesMetadata.instances, filters) &&
        !issuedWarningSeries.includes(seriesInstanceUIDs[0])
      ) {
        // stores the series instance filter so it shows only once the warning
        issuedWarningSeries.push(seriesInstanceUIDs[0]);
        uiNotificationService.show({
          title: 'Series filter',
          message: `Each of the series in filter: ${seriesInstanceUIDs} are not part of the current study. The entire study is being displayed`,
          type: 'error',
          duration: 7000,
        });
      }

      displaySetService.makeDisplaySets(seriesMetadata.instances, { madeInClient });
    }
  );

  unsubscriptions.push(instanceAddedUnsubscribe);

  log.time(Enums.TimingEnum.STUDY_TO_DISPLAY_SETS);
  log.time(Enums.TimingEnum.STUDY_TO_FIRST_IMAGE);

  const allRetrieves = studyInstanceUIDs.map(StudyInstanceUID =>
    dataSource.retrieve.series.metadata({
      StudyInstanceUID,
      filters,
      returnPromises: true,
      sortCriteria: customizationService.getCustomization('sortingCriteria'),
    })
  );

  // log the error if this fails, otherwise it's so difficult to tell what went wrong...
  allRetrieves.forEach(retrieve => {
    retrieve.catch(error => {
      console.error(error);
    });
  });

  // If the URL asks for a specific initial series, retrieve that display set
  // first so the hanging protocol can apply without waiting for every series.
  const params = new URLSearchParams(window.location.search);

  const initialSeriesInstanceUID = getSplitParam('initialseriesinstanceuid', params);
  const initialSOPInstanceUID = getSplitParam('initialsopinstanceuid', params);

  let displaySetFromUrl = false;
  if (initialSeriesInstanceUID || initialSOPInstanceUID) {
    displaySetFromUrl = true;
  }

  await Promise.allSettled(allRetrieves).then(async promises => {
    log.timeEnd(Enums.TimingEnum.STUDY_TO_DISPLAY_SETS);
    log.time(Enums.TimingEnum.DISPLAY_SETS_TO_FIRST_IMAGE);
    log.time(Enums.TimingEnum.DISPLAY_SETS_TO_ALL_IMAGES);

    const allPromises = [];
    const remainingPromises = [];

    function startRemainingPromises(remainingPromises) {
      remainingPromises.forEach(p => p.forEach(p => p.start()));
    }

    promises.forEach(promise => {
      const retrieveSeriesMetadataPromise = promise.value;
      if (!Array.isArray(retrieveSeriesMetadataPromise)) {
        return;
      }

      if (displaySetFromUrl) {
        const { requiredSeries, remaining } = splitSeriesPromisesByUID(
          retrieveSeriesMetadataPromise,
          initialSeriesInstanceUID
        );
        const requiredSeriesPromises = requiredSeries.map(promise => promise.start());
        allPromises.push(Promise.allSettled(requiredSeriesPromises));
        if (remaining.length) {
          remainingPromises.push(remaining);
        }
      } else {
        const { requiredSeries, remaining } = hangingProtocolService.filterSeriesRequiredForRun(
          hangingProtocolId,
          retrieveSeriesMetadataPromise
        );
        const requiredSeriesPromises = requiredSeries.map(promise => promise.start());
        allPromises.push(Promise.allSettled(requiredSeriesPromises));
        remainingPromises.push(remaining);
      }
    });

    await Promise.allSettled(allPromises).then(applyHangingProtocol);
    startRemainingPromises(remainingPromises);
    applyHangingProtocol();
  });

  return unsubscriptions;
}
