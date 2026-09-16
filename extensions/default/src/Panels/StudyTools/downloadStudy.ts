import { zip } from 'fflate';

export async function createStudyArchive(
  dataSource,
  studyInstanceUID: string
): Promise<Uint8Array> {
  const config = dataSource?.getConfig?.();
  if (config?.supportsStudyDownload === false) {
    throw new Error(
      config.studyDownloadUnavailableReason || 'Study download is unavailable for this data source.'
    );
  }
  if (!studyInstanceUID || !dataSource?.retrieve?.study) {
    throw new Error('Study download is unavailable for this data source.');
  }
  const instances: ArrayBuffer[] = await dataSource.retrieve.study({ studyInstanceUID });
  if (!instances?.length) {
    throw new Error('The server returned no DICOM files for this study.');
  }
  const files = Object.fromEntries(
    instances.map((instance, index) => [
      `instance-${String(index + 1).padStart(6, '0')}.dcm`,
      new Uint8Array(instance),
    ])
  );
  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, archive) => (error ? reject(error) : resolve(archive)));
  });
}

export function saveStudyArchive(archive: Uint8Array) {
  const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'study.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to start reading the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
