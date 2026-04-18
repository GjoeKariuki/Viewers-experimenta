/**
 * Calculates the center point and bounding box extent of a measurement based on its points.
 */
export const getCenterExtent = (measurement: { points?: number[][] }) => {
  const { points } = measurement;

  if (!points || !Array.isArray(points) || points.length === 0) {
    const defaultCenter: [number, number, number] = [0, 0, 0];
    const defaultExtent = {
      min: [0, 0, 0] as [number, number, number],
      max: [0, 0, 0] as [number, number, number],
    };
    return { center: defaultCenter, extent: defaultExtent };
  }

  const min: [number, number, number] = [...points[0]] as [number, number, number];
  const max: [number, number, number] = [...points[0]] as [number, number, number];

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    for (let j = 0; j < 3; j++) {
      min[j] = Math.min(min[j], point[j]);
      max[j] = Math.max(max[j], point[j]);
    }
  }

  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  return {
    center,
    extent: { min, max },
  };
};
