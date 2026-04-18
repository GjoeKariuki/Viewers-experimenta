import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const PRESENTATION_TYPE_ID = 'selectedSegmentationsForViewportId';
const DEBUG_STORE = false;

type SelectedSegmentationByTypeMap = Map<string, string>;

type SelectedSegmentationsForViewportState = {
  selectedSegmentationsForViewport: Record<string, SelectedSegmentationByTypeMap>;
  setSelectedSegmentationsForViewport: (key: string, value: SelectedSegmentationByTypeMap) => void;
  clearSelectedSegmentationsForViewportStore: () => void;
  type: string;
};

const createSelectedSegmentationsForViewportStore = (
  set
): SelectedSegmentationsForViewportState => ({
  selectedSegmentationsForViewport: {},
  type: PRESENTATION_TYPE_ID,

  setSelectedSegmentationsForViewport: (key, value) =>
    set(
      state => ({
        selectedSegmentationsForViewport: {
          ...state.selectedSegmentationsForViewport,
          [key]: value,
        },
      }),
      false,
      'setSelectedSegmentationsForViewport'
    ),

  clearSelectedSegmentationsForViewportStore: () =>
    set(
      { selectedSegmentationsForViewport: {} },
      false,
      'clearSelectedSegmentationsForViewportStore'
    ),
});

export const useSelectedSegmentationsForViewportStore =
  create<SelectedSegmentationsForViewportState>()(
    DEBUG_STORE
      ? devtools(createSelectedSegmentationsForViewportStore, {
          name: 'SelectedSegmentationsForViewportStore',
        })
      : createSelectedSegmentationsForViewportStore
  );
