class RepeatedStudyListingError extends Error {}

/** Enumerate the server's study, rather than the viewer's currently loaded display set. */
export default async function retrieveCompleteStudy(
  qidoClient,
  wadoClient,
  studyInstanceUID: string
) {
  try {
    return await retrieveFromListings(qidoClient, wadoClient, studyInstanceUID);
  } catch (error) {
    if (!(error instanceof RepeatedStudyListingError)) {
      throw error;
    }
    // Some PACS/static QIDO endpoints ignore offset and return the entire list again.
    // Use the study metadata endpoint to establish the complete inventory instead of
    // accepting a potentially truncated first page or repeatedly fetching it.
    const metadata = await wadoClient.retrieveStudyMetadata({ studyInstanceUID });
    if (!Array.isArray(metadata) || !metadata.length) {
      throw new Error('The server returned no study metadata. Study download stopped.');
    }
    const bySeries = new Map<string, Map<string, any>>();
    for (const item of metadata) {
      const studyUID = item['0020000D']?.Value?.[0];
      const seriesUID = item['0020000E']?.Value?.[0];
      const instanceUID = item['00080018']?.Value?.[0];
      if (studyUID !== studyInstanceUID || !seriesUID || !instanceUID) {
        throw new Error('The server returned invalid study metadata. Study download stopped.');
      }
      if (!bySeries.has(seriesUID)) {
        bySeries.set(seriesUID, new Map());
      }
      bySeries.get(seriesUID).set(instanceUID, item);
    }
    const series = Array.from(bySeries, ([uid, instances]) => ({
      '0020000E': { Value: [uid] },
      '00201209': { Value: [instances.size] },
    }));
    return retrieveFromListings(
      {
        searchForSeries: async ({ queryParams: { offset, limit } }) =>
          series.slice(offset, offset + limit),
        searchForInstances: async ({ seriesInstanceUID, queryParams: { offset, limit } }) =>
          Array.from(bySeries.get(seriesInstanceUID).values()).slice(offset, offset + limit),
      },
      wadoClient,
      studyInstanceUID
    );
  }
}

async function retrieveFromListings(qidoClient, wadoClient, studyInstanceUID: string) {
  const series = await queryAll(
    queryParams => qidoClient.searchForSeries({ studyInstanceUID, queryParams }),
    '0020000E'
  );
  if (!series.length) {
    throw new Error('The server returned no series for this study.');
  }

  const files: ArrayBuffer[] = [];
  for (const seriesMetadata of series) {
    const seriesInstanceUID = seriesMetadata['0020000E'].Value[0];
    const instances = await queryAll(
      queryParams =>
        qidoClient.searchForInstances({ studyInstanceUID, seriesInstanceUID, queryParams }),
      '00080018'
    );
    const expectedCount = Number(seriesMetadata['00201209']?.Value?.[0]);
    if (!instances.length || (expectedCount > 0 && instances.length !== expectedCount)) {
      throw new Error('The server returned an incomplete instance list. Study download stopped.');
    }
    // Bound parallel requests to avoid overwhelming the PACS or the browser.
    for (let offset = 0; offset < instances.length; offset += 4) {
      const batch = await Promise.all(
        instances.slice(offset, offset + 4).map(instance =>
          wadoClient.retrieveInstance({
            studyInstanceUID,
            seriesInstanceUID,
            sopInstanceUID: instance['00080018'].Value[0],
          })
        )
      );
      if (batch.some(file => !file?.byteLength)) {
        throw new Error('An instance could not be retrieved. Study download stopped.');
      }
      files.push(...batch);
    }
  }
  return files;
}

async function queryAll(query, uidTag: string) {
  const results = [];
  const seen = new Set<string>();
  const limit = 100;
  for (let offset = 0; ; ) {
    const page = await query({ limit, offset });
    if (!Array.isArray(page)) {
      throw new Error('Invalid study listing returned by the server.');
    }
    for (const item of page) {
      const uid = item[uidTag]?.Value?.[0];
      if (!uid) {
        throw new Error('The server returned a study listing without a DICOM identifier.');
      }
      if (seen.has(uid)) {
        throw new RepeatedStudyListingError('The server repeated a study listing.');
      }
      seen.add(uid);
      results.push(item);
    }
    if (page.length === 0) {
      return results;
    }
    offset += page.length;
  }
}
