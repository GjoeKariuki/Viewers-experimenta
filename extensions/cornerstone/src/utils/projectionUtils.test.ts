import { Enums } from '@cornerstonejs/core';
import {
  PROJECTION_MODES,
  blendModeToProjectionMode,
  clampProjectionSlabThickness,
  getDefaultProjectionSlabThickness,
  getMinimumProjectionSlabThickness,
  getProjectionSampleDistance,
  getProjectionSlabThicknessRange,
  projectionModeToBlendMode,
  resolveProjectionSlabThickness,
} from './projectionUtils';

jest.mock('@cornerstonejs/core', () => ({
  Enums: {
    BlendModes: {
      COMPOSITE: 'composite',
      MAXIMUM_INTENSITY_BLEND: 'mip',
      MINIMUM_INTENSITY_BLEND: 'minip',
      AVERAGE_INTENSITY_BLEND: 'avg',
    },
  },
}));

describe('projectionUtils', () => {
  describe('blendModeToProjectionMode', () => {
    it('maps maximum intensity blend to mip', () => {
      expect(blendModeToProjectionMode(Enums.BlendModes.MAXIMUM_INTENSITY_BLEND)).toBe(
        PROJECTION_MODES.MIP
      );
    });

    it('maps minimum intensity blend to minip', () => {
      expect(blendModeToProjectionMode(Enums.BlendModes.MINIMUM_INTENSITY_BLEND)).toBe(
        PROJECTION_MODES.MINIP
      );
    });

    it('maps average intensity blend to avg', () => {
      expect(blendModeToProjectionMode(Enums.BlendModes.AVERAGE_INTENSITY_BLEND)).toBe(
        PROJECTION_MODES.AVG
      );
    });

    it('falls back to composite for unknown values', () => {
      expect(blendModeToProjectionMode(undefined)).toBe(PROJECTION_MODES.COMPOSITE);
    });
  });

  describe('projectionModeToBlendMode', () => {
    it('maps projection modes back to cornerstone blend modes', () => {
      expect(projectionModeToBlendMode(PROJECTION_MODES.MIP)).toBe(
        Enums.BlendModes.MAXIMUM_INTENSITY_BLEND
      );
      expect(projectionModeToBlendMode(PROJECTION_MODES.MINIP)).toBe(
        Enums.BlendModes.MINIMUM_INTENSITY_BLEND
      );
      expect(projectionModeToBlendMode(PROJECTION_MODES.AVG)).toBe(
        Enums.BlendModes.AVERAGE_INTENSITY_BLEND
      );
      expect(projectionModeToBlendMode(PROJECTION_MODES.COMPOSITE)).toBe(
        Enums.BlendModes.COMPOSITE
      );
    });
  });

  describe('clampProjectionSlabThickness', () => {
    const range = { min: 0.5, max: 50, step: 0.25 };

    it('clamps values below the minimum', () => {
      expect(clampProjectionSlabThickness(0.1, range)).toBe(0.5);
    });

    it('clamps values above the maximum', () => {
      expect(clampProjectionSlabThickness(90, range)).toBe(50);
    });

    it('keeps values inside the valid range', () => {
      expect(clampProjectionSlabThickness(12.345, range)).toBe(12.35);
    });
  });

  describe('getProjectionSlabThicknessRange', () => {
    it('derives slab bounds from image spacing and dimensions with a safe interactive max', () => {
      const range = getProjectionSlabThicknessRange({
        imageData: {
          getDimensions: () => [256, 256, 100],
          getSpacing: () => [0.7, 0.7, 1.5],
        },
      });

      expect(range.min).toBe(0.7);
      expect(range.max).toBe(160);
      expect(range.step).toBe(0.35);
    });

    it('falls back to the provided thickness when image data is unavailable', () => {
      expect(getProjectionSlabThicknessRange(undefined, 3)).toEqual({
        min: 3,
        max: 3,
        step: 0.1,
      });
    });
  });

  describe('getMinimumProjectionSlabThickness', () => {
    it('uses the smallest valid volume spacing', () => {
      expect(getMinimumProjectionSlabThickness([1.2, 0.6, 2.5])).toBe(0.6);
    });

    it('falls back when spacing is unavailable', () => {
      expect(getMinimumProjectionSlabThickness(undefined, 2)).toBe(2);
    });
  });

  describe('projection slab resolution', () => {
    const range = { min: 0.5, max: 80, step: 0.25 };

    it('uses a clinical default slab thickness for MIP', () => {
      expect(getDefaultProjectionSlabThickness(range)).toBe(10);
      expect(getDefaultProjectionSlabThickness({ min: 20, max: 80, step: 1 })).toBe(20);
    });

    it('resolves symbolic slab thickness values', () => {
      expect(resolveProjectionSlabThickness('minimum', range)).toBe(0.5);
      expect(resolveProjectionSlabThickness('fullVolume', range)).toBe(80);
      expect(resolveProjectionSlabThickness('default', range)).toBe(10);
      expect(resolveProjectionSlabThickness('preserve', range, 12.345)).toBe(12.35);
    });
  });

  describe('getProjectionSampleDistance', () => {
    it('keeps generated MIP shaders below the target sample budget', () => {
      const sampleDistance = getProjectionSampleDistance({
        getDimensions: () => [512, 512, 600],
        getSpacing: () => [0.5, 0.5, 1],
      });

      expect(sampleDistance).toBeGreaterThan(0.5);
    });
  });
});
