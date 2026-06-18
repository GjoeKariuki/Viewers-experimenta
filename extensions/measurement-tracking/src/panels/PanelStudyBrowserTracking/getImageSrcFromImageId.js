const THUMBNAIL_CANVAS_WIDTH = 320;
const THUMBNAIL_CANVAS_HEIGHT = 286;

/**
 * @param {*} cornerstone
 * @param {*} imageId
 */
function getImageSrcFromImageId(cornerstone, imageId) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_CANVAS_WIDTH;
    canvas.height = THUMBNAIL_CANVAS_HEIGHT;

    cornerstone.utilities
      .loadImageToCanvas({ canvas, imageId, thumbnail: true })
      .then(() => {
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      })
      .catch(reject);
  });
}

export default getImageSrcFromImageId;
