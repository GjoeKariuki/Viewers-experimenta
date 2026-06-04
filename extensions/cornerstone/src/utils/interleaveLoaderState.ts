import { cache } from '@cornerstonejs/core';

type VolumeInput = {
  displaySetInstanceUID?: string;
  volumeId?: string;
};

type InterleaveLoaderState = {
  volumeIdMapsToLoad: Map<string, string>;
  viewportIdVolumeInputArrayMap: Map<string, unknown[]>;
  activeMatchSignature: string | null;
};

function getMatchedViewportIds(matchDetails): Set<string> {
  const matchedViewportIds = new Set<string>();

  matchDetails?.forEach?.((_matchDetail, viewportId) => {
    matchedViewportIds.add(viewportId);
  });

  return matchedViewportIds;
}

function getMatchSignature(matchDetails): string | null {
  if (!matchDetails?.size || !matchDetails?.forEach) {
    return null;
  }

  const entries = [];

  matchDetails.forEach((matchDetail, viewportId) => {
    const displaySetIds = (matchDetail?.displaySetsInfo || [])
      .map(({ displaySetInstanceUID }) => displaySetInstanceUID)
      .sort()
      .join(',');

    entries.push(`${viewportId}:${displaySetIds}`);
  });

  return entries.sort().join('|');
}

function isStoredStateCompatibleWithMatch(
  state: InterleaveLoaderState,
  matchDetails,
  matchedViewportIds: Set<string>
): boolean {
  for (const [viewportId, volumeInputArray] of state.viewportIdVolumeInputArrayMap.entries()) {
    if (!matchedViewportIds.has(viewportId)) {
      return false;
    }

    const matchedDisplaySetIds = new Set(
      (matchDetails.get?.(viewportId)?.displaySetsInfo || []).map(
        ({ displaySetInstanceUID }) => displaySetInstanceUID
      )
    );

    for (const volumeInput of volumeInputArray as VolumeInput[]) {
      const volumeDisplaySetId = volumeInput?.displaySetInstanceUID ?? volumeInput?.volumeId;

      if (volumeDisplaySetId && !matchedDisplaySetIds.has(volumeDisplaySetId)) {
        return false;
      }
    }
  }

  return true;
}

export function rebuildVolumeIdMapsToLoad(state: InterleaveLoaderState): void {
  state.volumeIdMapsToLoad.clear();

  state.viewportIdVolumeInputArrayMap.forEach(volumeInputArray => {
    volumeInputArray.forEach((volumeInput: VolumeInput) => {
      const { volumeId } = volumeInput || {};

      if (!volumeId || state.volumeIdMapsToLoad.has(volumeId)) {
        return;
      }

      const volume = cache.getVolume(volumeId);
      const seriesInstanceUID = volume?.metadata?.SeriesInstanceUID;

      if (seriesInstanceUID) {
        state.volumeIdMapsToLoad.set(volumeId, seriesInstanceUID);
      }
    });
  });
}

export function resetInterleaveLoaderState(state: InterleaveLoaderState): void {
  state.volumeIdMapsToLoad.clear();
  state.viewportIdVolumeInputArrayMap.clear();
  state.activeMatchSignature = null;
}

export function syncInterleaveLoaderStateToMatchDetails(
  state: InterleaveLoaderState,
  matchDetails,
  currentViewportId: string
): void {
  const matchedViewportIds = getMatchedViewportIds(matchDetails);

  // Older unit tests and callers may not provide HP viewport IDs. In that case
  // keep the legacy behavior and skip match-scoped pruning.
  if (!matchedViewportIds.size || !matchedViewportIds.has(currentViewportId)) {
    return;
  }

  const nextMatchSignature = getMatchSignature(matchDetails);

  if (nextMatchSignature && state.activeMatchSignature !== nextMatchSignature) {
    const canReuseStoredState = isStoredStateCompatibleWithMatch(
      state,
      matchDetails,
      matchedViewportIds
    );

    if (!canReuseStoredState) {
      state.volumeIdMapsToLoad.clear();
      state.viewportIdVolumeInputArrayMap.clear();
    }

    state.activeMatchSignature = nextMatchSignature;
  }

  let pruned = false;

  for (const viewportId of state.viewportIdVolumeInputArrayMap.keys()) {
    if (!matchedViewportIds.has(viewportId)) {
      state.viewportIdVolumeInputArrayMap.delete(viewportId);
      pruned = true;
    }
  }

  if (pruned) {
    rebuildVolumeIdMapsToLoad(state);
  }
}

export function isWaitingForMatchedViewports(
  state: InterleaveLoaderState,
  matchDetails
): boolean {
  const matchedViewportCount = matchDetails?.size || 0;

  return Boolean(
    matchedViewportCount && state.viewportIdVolumeInputArrayMap.size < matchedViewportCount
  );
}
