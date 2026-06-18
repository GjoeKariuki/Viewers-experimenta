import { HYDRATE_SEG_SYNC_GROUP, VOI_SYNC_GROUP } from './mpr';
import i18n from 'i18next';
import { volume3DDisplayPresets } from './volume3DDisplayPresets';
import { DEFAULT_MIP_SLAB_THICKNESS } from '../utils/projectionUtils';
export const primary3D = {
  id: 'primary3D',
  locked: true,
  name: i18n.t('Hps:3D primary'),
  icon: 'layout-advanced-3d-primary',
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
      id: 'primary3DStage',
      name: 'primary3D',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 3,
          columns: 3,
          layoutOptions: [
            {
              x: 0,
              y: 0,
              width: 2 / 3,
              height: 1,
            },
            {
              x: 2 / 3,
              y: 0,
              width: 1 / 3,
              height: 1 / 3,
            },
            {
              x: 2 / 3,
              y: 1 / 3,
              width: 1 / 3,
              height: 1 / 3,
            },
            {
              x: 2 / 3,
              y: 2 / 3,
              width: 1 / 3,
              height: 1 / 3,
            },
          ],
        },
      },
      viewports: [
        {
          viewportOptions: {
            toolGroupId: 'volume3d',
            viewportType: 'volume3d',
            orientation: 'coronal',
            customViewportProps: {
              hideOverlays: false,
            },
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
