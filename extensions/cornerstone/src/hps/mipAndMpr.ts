import { Types } from '@ohif/core';
import i18n from 'i18next';

import { HYDRATE_SEG_SYNC_GROUP, VOI_SYNC_GROUP } from './mpr';
import { DEFAULT_MIP_SLAB_THICKNESS } from '../utils/projectionUtils';

export const mipAndMpr: Types.HangingProtocol.Protocol = {
  id: 'mipAndMpr',
  name: i18n.t('Hps:MIP + MPR'),
  locked: true,
  icon: 'layout-advanced-3d-four-up',
  isPreset: true,
  createdDate: '2026-04-15',
  modifiedDate: '2026-04-15',
  availableTo: {},
  editableBy: {},
  numberOfPriorsReferenced: 0,
  protocolMatchingRules: [],
  imageLoadStrategy: 'interleaveCenter',
  callbacks: {},
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
      id: 'mipAndMprStage',
      name: 'MIP + MPR',
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
            viewportId: 'mip-overview',
            toolGroupId: 'mip',
            viewportType: 'volume',
            orientation: 'coronal',
            background: [0, 0, 0],
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
            viewportId: 'mpr-axial',
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
            },
          ],
        },
        {
          viewportOptions: {
            viewportId: 'mpr-sagittal',
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
            },
          ],
        },
        {
          viewportOptions: {
            viewportId: 'mpr-coronal',
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
            },
          ],
        },
      ],
    },
  ],
};
