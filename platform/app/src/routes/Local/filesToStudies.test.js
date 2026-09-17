import filesToStudies from './filesToStudies';
import { DicomMetadataStore } from '@ohif/core';

jest.mock('@ohif/core', () => ({
  DicomMetadataStore: { addInstance: jest.fn() },
}));
jest.mock('./fileLoaderService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    addFile: () => 'local-image',
    loadFile: async file => {
      if (file.invalid) {
        throw new Error('Invalid DICOM');
      }
      return file;
    },
    getDataset: async file => file,
  })),
}));

const instance = study => ({
  StudyInstanceUID: study,
  SeriesInstanceUID: `${study}.1`,
  SOPInstanceUID: `${study}.1.1`,
});

beforeEach(() => jest.clearAllMocks());

test('loads study instances alongside disc companion files and DICOMDIR', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    expect(
      await filesToStudies([
        { name: 'DICOMDIR' },
        { name: 'autorun.inf', invalid: true },
        { name: 'IM000001', ...instance('1') },
        instance('1'),
        instance('2'),
      ])
    ).toEqual(['1', '2']);
    expect(DicomMetadataStore.addInstance).toHaveBeenCalledTimes(3);
  } finally {
    log.mockRestore();
  }
});

test('returns only studies in the current selection', async () => {
  await filesToStudies([instance('previous')]);
  expect(await filesToStudies([instance('current')])).toEqual(['current']);
  expect(await filesToStudies([{ name: 'DICOMDIR' }])).toEqual([]);
});

test('processes files across multiple read batches', async () => {
  const files = Array.from({ length: 19 }, (_, index) => instance(String(index)));
  expect(await filesToStudies(files)).toEqual(files.map(file => file.StudyInstanceUID));
  expect(DicomMetadataStore.addInstance).toHaveBeenCalledTimes(19);
});

test('does not import files when cancelled before loading', async () => {
  const controller = new AbortController();
  controller.abort();
  expect(await filesToStudies([instance('1')], controller.signal)).toEqual([]);
  expect(DicomMetadataStore.addInstance).not.toHaveBeenCalled();
});

test('cancellation prevents remaining instances and subsequent batches from importing', async () => {
  const controller = new AbortController();
  DicomMetadataStore.addInstance.mockImplementationOnce(() => controller.abort());
  const files = Array.from({ length: 19 }, (_, index) => instance(String(index)));
  expect(await filesToStudies(files, controller.signal)).toEqual([]);
  expect(DicomMetadataStore.addInstance).toHaveBeenCalledTimes(1);
});
