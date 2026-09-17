import FileLoaderService from './fileLoaderService';
import { DicomMetadataStore } from '@ohif/core';

const processFile = async (file, signal) => {
  try {
    const fileLoaderService = new FileLoaderService(file);
    const imageId = fileLoaderService.addFile(file);
    const image = await fileLoaderService.loadFile(file, imageId);
    const dicomJSONDataset = await fileLoaderService.getDataset(image, imageId);

    // DICOMDIR and companion files are not study instances.
    if (
      signal?.aborted ||
      !dicomJSONDataset.StudyInstanceUID ||
      !dicomJSONDataset.SeriesInstanceUID ||
      !dicomJSONDataset.SOPInstanceUID
    ) {
      return;
    }
    DicomMetadataStore.addInstance(dicomJSONDataset);
    return dicomJSONDataset.StudyInstanceUID;
  } catch (error) {
    console.log(error.name, ':Error when trying to load and process local files:', error.message);
  }
};

export default async function filesToStudies(files, signal) {
  const studies = new Set();
  // Limit concurrent reads on removable media and avoid loading the entire disc at once.
  for (let index = 0; index < files.length; index += 8) {
    if (signal?.aborted) {
      return [];
    }
    const results = await Promise.all(
      files.slice(index, index + 8).map(file => processFile(file, signal))
    );
    results.filter(Boolean).forEach(study => studies.add(study));
  }
  return signal?.aborted ? [] : Array.from(studies);
}
