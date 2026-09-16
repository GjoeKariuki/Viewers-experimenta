import { unzipSync } from 'fflate';
import { createStudyArchive } from './downloadStudy';

describe('study ZIP download', () => {
  it('retrieves the entire selected study and preserves every instance byte for byte', async () => {
    const instances = [new Uint8Array([0, 1, 127, 255]), new Uint8Array([68, 73, 67, 77])];
    const study = jest.fn().mockResolvedValue(instances.map(bytes => bytes.buffer));
    const archive = await createStudyArchive({ retrieve: { study } }, '1.2.3');
    expect(study).toHaveBeenCalledWith({ studyInstanceUID: '1.2.3' });
    const files = unzipSync(archive);
    expect(Object.keys(files)).toEqual(['instance-000001.dcm', 'instance-000002.dcm']);
    expect(Array.from(files['instance-000001.dcm'])).toEqual(Array.from(instances[0]));
    expect(Array.from(files['instance-000002.dcm'])).toEqual(Array.from(instances[1]));
  });

  it('rejects missing studies and unsupported data sources', async () => {
    await expect(createStudyArchive({}, '1.2.3')).rejects.toThrow('unavailable');
    await expect(createStudyArchive({ retrieve: { study: jest.fn() } }, '')).rejects.toThrow(
      'unavailable'
    );
  });

  it('does not produce an empty archive or swallow server failures', async () => {
    await expect(
      createStudyArchive({ retrieve: { study: async () => [] } }, '1.2.3')
    ).rejects.toThrow('no DICOM');
    await expect(
      createStudyArchive(
        {
          retrieve: {
            study: async () => {
              throw new Error('Forbidden');
            },
          },
        },
        '1.2.3'
      )
    ).rejects.toThrow('Forbidden');
  });
});

it('rejects unsupported sources before making a network request', async () => {
  const study = jest.fn();
  await expect(
    createStudyArchive(
      {
        getConfig: () => ({ supportsStudyDownload: false }),
        retrieve: { study },
      },
      '1.2.3'
    )
  ).rejects.toThrow('unavailable');
  expect(study).not.toHaveBeenCalled();
});
