import { HYDRATE_SEG_SYNC_GROUP, VOI_SYNC_GROUP } from './mpr';
import i18n from 'i18next';
import { volume3DDisplayPresets } from './volume3DDisplayPresets';
import { DEFAULT_MIP_SLAB_THICKNESS } from '../utils/projectionUtils';
export const fourUp = {
  id: 'fourUp',
  locked: true,
  name: i18n.t('Hps:3D four up'),
  icon: 'layout-advanced-3d-four-up',
  isPreset: true,
  createdDate: '2023-03-15T10:29:44.894Z',
  modifiedDate: '2023-03-15T10:29:44.894Z',
  availableTo: {},
  editableBy: {},
  protocolMatchingRules: [],
  imageLoadStrategy: 'interleaveCenter',
  callbacks: { onViewportDataInitialized: ['setCTBoneOnlyRendering'] },
  displaySetSelectors: {
    activeDisplaySet: {
      seriesMatchingRules: [
        {
          weight: 1,
          attribute: 'isReconstructable',
          constraint: {
            equals: {
              value: true,
            },
          },
          required: true,
        },
      ],
    },
  },
  stages: [
    {
      id: 'fourUpStage',
      name: 'fourUp',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'mpr',
            viewportType: 'volume',
            orientation: 'axial',
            initialImageOptions: {
              preset: 'middle',
            },
            syncGroups: [VOI_SYNC_GROUP, HYDRATE_SEG_SYNC_GROUP],
          },
          displaySets: [
            {
              id: 'activeDisplaySet',
              options: {
                blendMode: 'mip',
                slabThickness: DEFAULT_MIP_SLAB_THICKNESS,
              },
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'volume3d',
            viewportType: 'volume3d',
            orientation: 'coronal',
            customViewportProps: {
              hideOverlays: false,
            },
            syncGroups: [HYDRATE_SEG_SYNC_GROUP],
          },
          displaySets: [
            {
              id: 'activeDisplaySet',
              options: {
                displayPreset: volume3DDisplayPresets,
              },
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'mpr',
            viewportType: 'volume',
            orientation: 'coronal',
            initialImageOptions: {
              preset: 'middle',
            },
            syncGroups: [VOI_SYNC_GROUP, HYDRATE_SEG_SYNC_GROUP],
          },
          displaySets: [
            {
              id: 'activeDisplaySet',
              options: {
                blendMode: 'mip',
                slabThickness: DEFAULT_MIP_SLAB_THICKNESS,
              },
            },
          ],
        },
        {
          viewportOptions: {
            toolGroupId: 'mpr',
            viewportType: 'volume',
            orientation: 'sagittal',
            initialImageOptions: {
              preset: 'middle',
            },
            syncGroups: [VOI_SYNC_GROUP, HYDRATE_SEG_SYNC_GROUP],
          },
          displaySets: [
            {
              id: 'activeDisplaySet',
              options: {
                blendMode: 'mip',
                slabThickness: DEFAULT_MIP_SLAB_THICKNESS,
              },
            },
          ],
        },
      ],
    },
  ],
};
