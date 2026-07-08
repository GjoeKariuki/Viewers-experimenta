import { SOPClassHandlerId } from './id';
import { utils, Types as OhifTypes } from '@ohif/core';
import i18n from '@ohif/i18n';

const SOP_CLASS_UIDS = {
  ENCAPSULATED_PDF: '1.2.840.10008.5.1.4.1.1.104.1',
};

const sopClassUids = Object.values(SOP_CLASS_UIDS);

async function getPdfThumbnailSrc(renderedUrl) {
  const url = await renderedUrl;

  if (!url) {
    return null;
  }

  return `${url.split('#')[0]}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`;
}

const _getDisplaySetsFromSeries = (instances, servicesManager, extensionManager) => {
  const dataSource = extensionManager.getActiveDataSource()[0];
  return instances.map(instance => {
    const { Modality, SOPInstanceUID } = instance;
    const { SeriesDescription = 'PDF', MIMETypeOfEncapsulatedDocument } = instance;
    const {
      SeriesNumber,
      SeriesDate,
      SeriesTime,
      SeriesInstanceUID,
      StudyDescription,
      StudyInstanceUID,
      StudyTime,
      SOPClassUID,
    } = instance;
    const renderedUrl = dataSource.retrieve.directURL({
      instance,
      tag: 'EncapsulatedDocument',
      defaultType: MIMETypeOfEncapsulatedDocument || 'application/pdf',
      singlepart: 'pdf',
      forceRetrieve: true,
    });

    const displaySet = {
      //plugin: id,
      Modality,
      displaySetInstanceUID: utils.guid(),
      SeriesDescription,
      SeriesNumber,
      SeriesDate,
      SeriesTime,
      SOPInstanceUID,
      SeriesInstanceUID,
      StudyDescription,
      StudyInstanceUID,
      StudyTime,
      SOPClassHandlerId,
      SOPClassUID,
      referencedImages: null,
      measurements: null,
      renderedUrl: renderedUrl,
      instances: [instance],
      thumbnailSrc: undefined,
      thumbnailContentType: 'application/pdf',
      getThumbnailSrc: () => getPdfThumbnailSrc(renderedUrl),
      isDerivedDisplaySet: true,
      isLoaded: false,
      sopClassUids,
      numImageFrames: 0,
      numInstances: 1,
      instance,
      supportsWindowLevel: true,
      label: SeriesDescription || `${i18n.t('Series')} ${SeriesNumber} - ${i18n.t(Modality)}`,
    };
    return displaySet;
  });
};

export default function getSopClassHandlerModule(params) {
  const { servicesManager, extensionManager } = params;
  const getDisplaySetsFromSeries = instances => {
    return _getDisplaySetsFromSeries(instances, servicesManager, extensionManager);
  };

  return [
    {
      name: 'dicom-pdf',
      sopClassUids,
      getDisplaySetsFromSeries,
    },
  ];
}
