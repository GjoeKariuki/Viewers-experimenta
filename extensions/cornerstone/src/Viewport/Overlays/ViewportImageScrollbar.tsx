import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Enums, VolumeViewport3D, utilities as csUtils } from '@cornerstonejs/core';
import { ImageScrollbar } from '@ohif/ui-next';

type ImageSliceData = {
  imageIndex: number;
  numberOfSlices: number;
};

type CornerstoneImageScrollbarProps = withAppTypes<{
  viewportData?: {
    viewportType?: Enums.ViewportType;
  };
  viewportId: string;
  element: HTMLElement;
  imageSliceData: ImageSliceData;
  setImageSliceData: (imageSliceData: ImageSliceData) => void;
  scrollbarHeight: string;
}>;

function CornerstoneImageScrollbar({
  viewportData,
  viewportId,
  element,
  imageSliceData,
  setImageSliceData,
  scrollbarHeight,
  servicesManager,
}: CornerstoneImageScrollbarProps) {
  const { cineService, cornerstoneViewportService } = servicesManager.services;

  const onImageScrollbarChange = (imageIndex: number, viewportId: string) => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport || viewport instanceof VolumeViewport3D || !viewport.element) {
      return;
    }

    const { isCineEnabled, cines } = cineService.getState();

    if (isCineEnabled) {
      // on image scrollbar change, stop the CINE if it is playing
      cineService.stopClip(element, { viewportId });
      cineService.setCine({
        id: viewportId,
        frameRate: cines?.[viewportId]?.frameRate ?? 24,
        isPlaying: false,
      });
    }

    try {
      csUtils.jumpToSlice(viewport.element, {
        imageIndex,
        debounceLoading: true,
      });
    } catch (error) {
      console.warn('Unable to jump to image slice from scrollbar', error);
      cornerstoneViewportService.scheduleRenderingRecovery?.('image scrollbar slice jump failed');
    }
  };

  useEffect(() => {
    if (!viewportData) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport || viewport instanceof VolumeViewport3D) {
      return;
    }

    try {
      const imageIndex = viewport.getCurrentImageIdIndex?.();
      const numberOfSlices = viewport.getNumberOfSlices?.();

      if (!Number.isFinite(imageIndex) || !Number.isFinite(numberOfSlices)) {
        return;
      }

      setImageSliceData({
        imageIndex,
        numberOfSlices,
      });
    } catch (error) {
      console.warn(error);
      cornerstoneViewportService.scheduleRenderingRecovery?.(
        'image scrollbar initialization failed'
      );
    }
  }, [cornerstoneViewportService, setImageSliceData, viewportData, viewportId]);

  useEffect(() => {
    if (!viewportData) {
      return;
    }
    const { viewportType } = viewportData;
    const eventId =
      (viewportType === Enums.ViewportType.STACK && Enums.Events.STACK_NEW_IMAGE) ||
      (viewportType === Enums.ViewportType.ORTHOGRAPHIC && Enums.Events.VOLUME_NEW_IMAGE) ||
      Enums.Events.IMAGE_RENDERED;

    const updateIndex = (event: Event) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (!viewport || viewport instanceof VolumeViewport3D) {
        return;
      }
      const {
        imageIndex,
        newImageIdIndex = imageIndex,
        imageIdIndex,
      } = (event as CustomEvent).detail || {};
      const nextImageIndex =
        newImageIdIndex ?? imageIdIndex ?? viewport.getCurrentImageIdIndex?.() ?? 0;
      const numberOfSlices = viewport.getNumberOfSlices?.();

      if (!Number.isFinite(nextImageIndex) || !Number.isFinite(numberOfSlices)) {
        return;
      }

      // find the index of imageId in the imageIds
      setImageSliceData({
        imageIndex: nextImageIndex,
        numberOfSlices,
      });
    };

    element.addEventListener(eventId, updateIndex);

    return () => {
      element.removeEventListener(eventId, updateIndex);
    };
  }, [cornerstoneViewportService, element, setImageSliceData, viewportData, viewportId]);

  return (
    <ImageScrollbar
      onChange={evt => onImageScrollbarChange(evt, viewportId)}
      max={imageSliceData.numberOfSlices ? imageSliceData.numberOfSlices - 1 : 0}
      height={scrollbarHeight}
      value={imageSliceData.imageIndex || 0}
    />
  );
}

CornerstoneImageScrollbar.propTypes = {
  viewportData: PropTypes.object,
  viewportId: PropTypes.string.isRequired,
  element: PropTypes.instanceOf(Element),
  scrollbarHeight: PropTypes.string,
  imageSliceData: PropTypes.object.isRequired,
  setImageSliceData: PropTypes.func.isRequired,
  servicesManager: PropTypes.object.isRequired,
};

export default CornerstoneImageScrollbar;
