import retrieveCompleteStudy from './retrieveCompleteStudy';
import { createStudyArchive } from '../Panels/StudyTools/downloadStudy';
import { unzipSync } from 'fflate';

const series = (uid, count) => ({
  '0020000E': { Value: [uid] },
  '00201209': { Value: [count] },
});
const instance = uid => ({ '00080018': { Value: [uid] } });

it('exports every instance across series, including server-capped pages, without using the current image', async () => {
  const qido = {
    searchForSeries: jest.fn(async ({ queryParams: { offset } }) =>
      [series('series-a', 2), series('series-b', 1)].slice(offset, offset + 1)
    ),
    searchForInstances: jest.fn(async ({ seriesInstanceUID, queryParams: { offset } }) => {
      const instances =
        seriesInstanceUID === 'series-a' ? [instance('a1'), instance('a2')] : [instance('b1')];
      return instances.slice(offset, offset + 1);
    }),
  };
  const wado = {
    retrieveInstance: jest.fn(
      async ({ sopInstanceUID }) =>
        new Uint8Array([sopInstanceUID === 'a1' ? 1 : sopInstanceUID === 'a2' ? 2 : 3]).buffer
    ),
  };
  const dataSource = {
    retrieve: {
      study: ({ studyInstanceUID }) => retrieveCompleteStudy(qido, wado, studyInstanceUID),
    },
  };
  const files = unzipSync(await createStudyArchive(dataSource, 'whole-study'));
  expect(Object.values(files).map(bytes => Array.from(bytes))).toEqual([[1], [2], [3]]);
  expect(wado.retrieveInstance.mock.calls.map(([request]) => request)).toEqual([
    { studyInstanceUID: 'whole-study', seriesInstanceUID: 'series-a', sopInstanceUID: 'a1' },
    { studyInstanceUID: 'whole-study', seriesInstanceUID: 'series-a', sopInstanceUID: 'a2' },
    { studyInstanceUID: 'whole-study', seriesInstanceUID: 'series-b', sopInstanceUID: 'b1' },
  ]);
});

it('rejects partial instance listings rather than creating a partial study ZIP', async () => {
  const qido = {
    searchForSeries: async ({ queryParams: { offset } }) => (offset ? [] : [series('a', 2)]),
    searchForInstances: async ({ queryParams: { offset } }) => (offset ? [] : [instance('a1')]),
  };
  await expect(retrieveCompleteStudy(qido, {}, 'study')).rejects.toThrow(
    'incomplete instance list'
  );
});

it('uses complete study metadata when QIDO ignores pagination, including instances beyond its first page', async () => {
  const qido = { searchForSeries: jest.fn(async () => [series('a', 1)]) };
  const metadata = (seriesUID, uid) => ({
    '0020000D': { Value: ['study'] },
    '0020000E': { Value: [seriesUID] },
    '00080018': { Value: [uid] },
  });
  const wado = {
    retrieveStudyMetadata: jest.fn(async () => [
      metadata('a', 'a1'),
      metadata('b', 'b1'),
      metadata('b', 'b2'),
      metadata('b', 'b2'),
    ]),
    retrieveInstance: jest.fn(async () => new Uint8Array([1]).buffer),
  };
  const files = await retrieveCompleteStudy(qido, wado, 'study');
  expect(files).toHaveLength(3);
  expect(qido.searchForSeries).toHaveBeenCalledTimes(2);
  expect(wado.retrieveStudyMetadata).toHaveBeenCalledWith({ studyInstanceUID: 'study' });
  expect(wado.retrieveInstance.mock.calls.map(([request]) => request.sopInstanceUID)).toEqual([
    'a1',
    'b1',
    'b2',
  ]);
});

it('also recovers when instance listings repeat', async () => {
  const qido = {
    searchForSeries: async ({ queryParams: { offset } }) => (offset ? [] : [series('a', 2)]),
    searchForInstances: async () => [instance('a1')],
  };
  const wado = {
    retrieveStudyMetadata: async () =>
      ['a1', 'a2'].map(uid => ({
        '0020000D': { Value: ['study'] },
        '0020000E': { Value: ['a'] },
        '00080018': { Value: [uid] },
      })),
    retrieveInstance: jest.fn(async () => new Uint8Array([1]).buffer),
  };
  expect(await retrieveCompleteStudy(qido, wado, 'study')).toHaveLength(2);
});

it('does not export a partial ZIP if fallback metadata is unavailable or belongs to another study', async () => {
  const qido = { searchForSeries: async () => [series('a', 1)] };
  const wado = {
    retrieveStudyMetadata: jest
      .fn()
      .mockRejectedValueOnce(new Error('Metadata unavailable'))
      .mockResolvedValueOnce([
        {
          '0020000D': { Value: ['another-study'] },
          '0020000E': { Value: ['a'] },
          '00080018': { Value: ['a1'] },
        },
      ]),
    retrieveInstance: jest.fn(),
  };
  await expect(retrieveCompleteStudy(qido, wado, 'study')).rejects.toThrow('Metadata unavailable');
  await expect(retrieveCompleteStudy(qido, wado, 'study')).rejects.toThrow(
    'invalid study metadata'
  );
  expect(wado.retrieveInstance).not.toHaveBeenCalled();
});

it('fails the download when any individual file cannot be retrieved', async () => {
  const qido = {
    searchForSeries: async ({ queryParams: { offset } }) => (offset ? [] : [series('a', 1)]),
    searchForInstances: async ({ queryParams: { offset } }) => (offset ? [] : [instance('a1')]),
  };
  const wado = {
    retrieveInstance: async () => {
      throw new Error('Retrieval failed');
    },
  };
  await expect(retrieveCompleteStudy(qido, wado, 'study')).rejects.toThrow('Retrieval failed');
});
