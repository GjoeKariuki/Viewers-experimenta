import { Types } from '@ohif/core';
import i18n from 'i18next';

import { HYDRATE_SEG_SYNC_GROUP, VOI_SYNC_GROUP } from './mpr';
import { DEFAULT_MIP_SLAB_THICKNESS } from '../utils/projectionUtils';

export const mip: Types.HangingProtocol.Protocol = {
  id: 'mip',
  name: i18n.t('Hps:MIP'),
  locked: true,
  icon: 'layout-advanced-3d-only',
  isPreset: true,
  createdDate: '2026-04-14',
  modifiedDate: '2026-04-14',
  availableTo: {},
  editableBy: {},
  numberOfPriorsReferenced: 0,
  protocolMatchingRules: [],
  imageLoadStrategy: 'nth',
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
      id: 'mipStage',
      name: 'MIP',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            viewportId: 'mip',
            toolGroupId: 'mip',
            viewportType: 'volume',
            orientation: 'acquisition',
            background: [0, 0, 0],
            initialImageOptions: {
              preset: 'middle',
            },
            syncGroups: [VOI_SYNC_GROUP, HYDRATE_SEG_SYNC_GROUP],
            customViewportProps: {
              hideOverlays: false,
            },
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
