import { Enums } from '@cornerstonejs/core';

export const PROJECTION_MODES = {
  COMPOSITE: 'composite',
  MIP: 'mip',
  MINIP: 'minip',
  AVG: 'avg',
} as const;

export type ProjectionMode = (typeof PROJECTION_MODES)[keyof typeof PROJECTION_MODES];

export type ProjectionSlabThicknessRange = {
  min: number;
  max: number;
  step: number;
};

export const MINIMUM_SLAB_THICKNESS = 0.1;
export const DEFAULT_MIP_SLAB_THICKNESS = 10;
export const MAX_INTERACTIVE_PROJECTION_SLAB_THICKNESS = 160;
export const MAX_PROJECTION_SHADER_SAMPLES = 512;
const DEFAULT_STEP = 0.1;

function roundToPrecision(value: number, precision = 2): number {
  return Number(value.toFixed(precision));
}

export function blendModeToProjectionMode(blendMode?: Enums.BlendModes): ProjectionMode {
  switch (blendMode) {
    case Enums.BlendModes.MAXIMUM_INTENSITY_BLEND:
      return PROJECTION_MODES.MIP;
    case Enums.BlendModes.MINIMUM_INTENSITY_BLEND:
      return PROJECTION_MODES.MINIP;
    case Enums.BlendModes.AVERAGE_INTENSITY_BLEND:
      return PROJECTION_MODES.AVG;
    default:
      return PROJECTION_MODES.COMPOSITE;
  }
}

export function projectionModeToBlendMode(mode: ProjectionMode): Enums.BlendModes {
  switch (mode) {
    case PROJECTION_MODES.MIP:
      return Enums.BlendModes.MAXIMUM_INTENSITY_BLEND;
    case PROJECTION_MODES.MINIP:
      return Enums.BlendModes.MINIMUM_INTENSITY_BLEND;
    case PROJECTION_MODES.AVG:
      return Enums.BlendModes.AVERAGE_INTENSITY_BLEND;
    default:
      return Enums.BlendModes.COMPOSITE;
  }
}

export function clampProjectionSlabThickness(
  slabThickness: number,
  range: ProjectionSlabThicknessRange
): number {
  return roundToPrecision(Math.min(Math.max(slabThickness, range.min), range.max));
}

export function getDefaultProjectionSlabThickness(
  range: ProjectionSlabThicknessRange,
  preferredThickness = DEFAULT_MIP_SLAB_THICKNESS
): number {
  return clampProjectionSlabThickness(Math.max(preferredThickness, range.min), range);
}

export function resolveProjectionSlabThickness(
  slabThickness: number | 'fullVolume' | 'minimum' | 'min' | 'default' | 'preserve' | undefined,
  range: ProjectionSlabThicknessRange,
  currentThickness = range.min
): number | undefined {
  if (slabThickness === undefined) {
    return undefined;
  }

  if (typeof slabThickness === 'number') {
    return clampProjectionSlabThickness(slabThickness, range);
  }

  switch (slabThickness.toLowerCase()) {
    case 'minimum':
    case 'min':
      return range.min;
    case 'fullvolume':
      return range.max;
    case 'default':
      return getDefaultProjectionSlabThickness(range);
    case 'preserve':
      return clampProjectionSlabThickness(currentThickness, range);
    default:
      return undefined;
  }
}

export function getMinimumProjectionSlabThickness(
  spacing?: number[],
  fallbackThickness = MINIMUM_SLAB_THICKNESS
): number {
  const validSpacing = spacing?.filter(value => Number.isFinite(value) && value > 0);

  if (!validSpacing?.length) {
    return roundToPrecision(Math.max(fallbackThickness, MINIMUM_SLAB_THICKNESS));
  }

  return roundToPrecision(Math.max(Math.min(...validSpacing), MINIMUM_SLAB_THICKNESS));
}

export function getProjectionSlabThicknessRange(
  imageData?: {
    imageData?: {
      getDimensions?: () => number[];
      getSpacing?: () => number[];
    };
  },
  fallbackThickness = MINIMUM_SLAB_THICKNESS
): ProjectionSlabThicknessRange {
  const dimensions = imageData?.imageData?.getDimensions?.();
  const spacing = imageData?.imageData?.getSpacing?.();

  if (!dimensions?.length || !spacing?.length) {
    const fallback = roundToPrecision(Math.max(fallbackThickness, MINIMUM_SLAB_THICKNESS));

    return {
      min: fallback,
      max: fallback,
      step: DEFAULT_STEP,
    };
  }

  const validSpacing = spacing.filter(value => Number.isFinite(value) && value > 0);
  if (!validSpacing.length) {
    const fallback = roundToPrecision(Math.max(fallbackThickness, MINIMUM_SLAB_THICKNESS));

    return {
      min: fallback,
      max: fallback,
      step: DEFAULT_STEP,
    };
  }

  const [dimX = 1, dimY = 1, dimZ = 1] = dimensions;
  const [spacingX = validSpacing[0], spacingY = validSpacing[0], spacingZ = validSpacing[0]] =
    spacing;
  const minSpacing = getMinimumProjectionSlabThickness(validSpacing);
  const diagonal = Math.sqrt(
    Math.pow(dimX * spacingX, 2) + Math.pow(dimY * spacingY, 2) + Math.pow(dimZ * spacingZ, 2)
  );
  const maxThickness = Math.max(
    minSpacing,
    Math.min(diagonal, MAX_INTERACTIVE_PROJECTION_SLAB_THICKNESS)
  );

  return {
    min: roundToPrecision(minSpacing),
    max: roundToPrecision(maxThickness),
    step: roundToPrecision(Math.max(minSpacing / 2, DEFAULT_STEP)),
  };
}

export function getProjectionSampleDistance(
  imageData?: {
    getDimensions?: () => number[];
    getSpacing?: () => number[];
  },
  fallbackSampleDistance = 1
): number {
  const dimensions = imageData?.getDimensions?.();
  const spacing = imageData?.getSpacing?.();
  const validSpacing = spacing?.filter(value => Number.isFinite(value) && value > 0);
  const minSpacing = validSpacing?.length ? Math.min(...validSpacing) : fallbackSampleDistance;

  if (!dimensions?.length || !spacing?.length) {
    return roundToPrecision(Math.max(minSpacing, fallbackSampleDistance), 3);
  }

  const [dimX = 1, dimY = 1, dimZ = 1] = dimensions;
  const [spacingX = validSpacing?.[0] || fallbackSampleDistance] = spacing;
  const spacingY = spacing[1] || spacingX;
  const spacingZ = spacing[2] || spacingX;
  const diagonal = Math.sqrt(
    Math.pow(dimX * spacingX, 2) + Math.pow(dimY * spacingY, 2) + Math.pow(dimZ * spacingZ, 2)
  );

  if (!Number.isFinite(diagonal) || diagonal <= 0) {
    return roundToPrecision(Math.max(minSpacing, fallbackSampleDistance), 3);
  }

  return roundToPrecision(Math.max(minSpacing, diagonal / MAX_PROJECTION_SHADER_SAMPLES), 3);
}
