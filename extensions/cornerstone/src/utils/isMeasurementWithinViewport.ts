/**
 * Determines if a measurement is within the current viewport extent.
 */
export const isMeasurementWithinViewport = ({ viewport, measurement }) => {
  const camera = viewport.getCamera();
  const { focalPoint, parallelScale } = camera;

  for (const point of measurement.points) {
    const [x, y, z] = point;
    const dx = x - focalPoint[0];
    const dy = y - focalPoint[1];
    const dz = z - focalPoint[2];

    if (
      Math.abs(dx) > parallelScale ||
      Math.abs(dy) > parallelScale ||
      Math.abs(dz) > parallelScale
    ) {
      return false;
    }
  }

  return true;
};
