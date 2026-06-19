import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import './OHIFCornerstonePdfViewport.css';

const pdfCanvasMediaQuery = '(hover: none), (pointer: coarse), (max-width: 767px)';
const documentPhotoAspectRatioThreshold = 1.45;
const pdfWorkerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.js',
  import.meta.url
).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function shouldPreferPdfCanvas() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(pdfCanvasMediaQuery).matches
  );
}

function normalizeRotation(rotation) {
  return ((rotation % 360) + 360) % 360;
}

function hasQuarterTurn(rotation) {
  const normalizedRotation = normalizeRotation(rotation);
  return normalizedRotation === 90 || normalizedRotation === 270;
}

function getDocumentPhotoRotation(viewport, hasSearchableText) {
  if (hasSearchableText || !viewport?.width || !viewport?.height) {
    return 0;
  }

  return viewport.height / viewport.width >= documentPhotoAspectRatioThreshold ? 90 : 0;
}

async function pageHasSearchableText(page) {
  try {
    const textContent = await page.getTextContent();
    return textContent.items.some(item => item?.str?.trim());
  } catch {
    return false;
  }
}

function getPageScale({ viewport, pagesContainer, fitRotatedDocumentPhotoToHeight }) {
  const availableWidth = Math.max(pagesContainer.clientWidth - 24, 320);
  const scaleToWidth = availableWidth / viewport.width;

  if (!fitRotatedDocumentPhotoToHeight) {
    return Math.min(2.5, scaleToWidth);
  }

  const availableHeight = Math.max(pagesContainer.clientHeight - 24, availableWidth);
  const scaleToHeight = availableHeight / viewport.height;

  return Math.min(2.5, Math.max(scaleToWidth, scaleToHeight));
}

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
  const [orientation, setOrientation] = useState({
    documentPhotoRotation: 0,
    metadataRotation: 0,
  });
  const [usePdfCanvas, setUsePdfCanvas] = useState(shouldPreferPdfCanvas);
  const [pdfRenderStatus, setPdfRenderStatus] = useState('idle');
  const [pdfRenderError, setPdfRenderError] = useState(null);
  const containerRef = useRef(null);
  const pdfCanvasContainerRef = useRef(null);
  const viewportElementRef = useRef(null);
  const viewportRef = useViewportRef(viewportId);

  useEffect(() => {
    document.body.addEventListener('drag', makePdfDropTarget);
    return function cleanup() {
      document.body.removeEventListener('drag', makePdfDropTarget);
      viewportRef.unregister();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(pdfCanvasMediaQuery);
    const syncPdfCanvasPreference = () => setUsePdfCanvas(mediaQuery.matches);

    syncPdfCanvasPreference();
    mediaQuery.addEventListener?.('change', syncPdfCanvasPreference);

    return () => {
      mediaQuery.removeEventListener?.('change', syncPdfCanvasPreference);
    };
  }, []);

  const [style, setStyle] = useState('pdf-yes-click');

  const makePdfScrollable = () => {
    setStyle('pdf-yes-click');
  };

  const makePdfDropTarget = () => {
    setStyle('pdf-no-click');
  };

  if (displaySets && displaySets.length > 1) {
    throw new Error(
      'OHIFCornerstonePdfViewport: only one display set is supported for dicom pdf right now'
    );
  }

  const { renderedUrl } = displaySets[0];

  useEffect(() => {
    let cancelled = false;

    setUrl(null);
    setOrientation({ documentPhotoRotation: 0, metadataRotation: 0 });
    setPdfRenderStatus('idle');
    setPdfRenderError(null);

    const load = async () => {
      const nextUrl = await renderedUrl;

      if (!cancelled) {
        setUrl(nextUrl);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [renderedUrl]);

  // Detect the first page orientation so scanned document photos open in a readable layout.
  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;
    let loadingTask;

    const detectOrientation = async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const unrotatedViewport = page.getViewport({ scale: 1, rotation: 0 });
        const hasSearchableText = await pageHasSearchableText(page);
        const nextOrientation = {
          documentPhotoRotation: getDocumentPhotoRotation(unrotatedViewport, hasSearchableText),
          metadataRotation: normalizeRotation(page.rotate || 0),
        };

        page.cleanup?.();
        await pdf.destroy?.();
        loadingTask = null;

        if (!cancelled) {
          setOrientation(nextOrientation);
        }
      } catch {
        if (!cancelled) {
          setOrientation({ documentPhotoRotation: 0, metadataRotation: 0 });
        }
      }
    };

    detectOrientation();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [url]);

  const canvasRotation = normalizeRotation(orientation.documentPhotoRotation);
  const objectRotation = normalizeRotation(
    orientation.documentPhotoRotation - orientation.metadataRotation
  );
  const shouldRenderPdfCanvas = usePdfCanvas;

  useEffect(() => {
    if (!url || !shouldRenderPdfCanvas) {
      return;
    }

    const pagesContainer = pdfCanvasContainerRef.current;
    if (!pagesContainer) {
      return;
    }

    let cancelled = false;
    let loadingTask;
    const renderTasks = [];

    const renderPdf = async () => {
      setPdfRenderStatus('loading');
      setPdfRenderError(null);
      pagesContainer.innerHTML = '';
      pagesContainer.dataset.hasWidePages = 'false';

      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        let hasWidePages = false;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) {
            break;
          }

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1, rotation: canvasRotation });
          const fitRotatedDocumentPhotoToHeight =
            orientation.documentPhotoRotation !== 0 && hasQuarterTurn(canvasRotation);
          const scale = getPageScale({
            viewport: baseViewport,
            pagesContainer,
            fitRotatedDocumentPhotoToHeight,
          });
          const viewport = page.getViewport({ scale, rotation: canvasRotation });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          const canvas = document.createElement('canvas');
          const canvasContext = canvas.getContext('2d');

          if (!canvasContext) {
            throw new Error('Canvas 2D context is not available for PDF rendering');
          }

          canvas.className = 'pdf-canvas-page';
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const pageElement = document.createElement('div');
          pageElement.className = 'pdf-canvas-page-wrapper';
          pageElement.dataset.rotation = String(canvasRotation);
          if (viewport.width > pagesContainer.clientWidth) {
            pageElement.classList.add('pdf-canvas-page-wrapper-wide');
            hasWidePages = true;
          }
          pageElement.appendChild(canvas);
          pagesContainer.appendChild(pageElement);
          pagesContainer.dataset.hasWidePages = hasWidePages ? 'true' : 'false';

          const renderTask = page.render({
            canvasContext,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
          });
          renderTasks.push(renderTask);
          await renderTask.promise;
          page.cleanup?.();
        }

        await pdf.destroy?.();
        loadingTask = null;

        if (!cancelled) {
          setPdfRenderStatus('ready');
        }
      } catch (error) {
        if (!cancelled && error?.name !== 'RenderingCancelledException') {
          setPdfRenderError(error);
          setPdfRenderStatus('error');
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      renderTasks.forEach(renderTask => renderTask.cancel?.());
      loadingTask?.destroy?.();
      pagesContainer.innerHTML = '';
    };
  }, [url, shouldRenderPdfCanvas, canvasRotation, orientation.documentPhotoRotation]);

  const embeddedUrl = url ? `${url}#toolbar=1&navpanes=0&scrollbar=1` : undefined;
  const isSideways = hasQuarterTurn(objectRotation);

  return (
    <div
      className="bg-background pdf-viewport-outer text-foreground"
      onClick={makePdfScrollable}
      ref={el => {
        containerRef.current = el;
        viewportElementRef.current = el;
        if (el) viewportRef.register(el);
      }}
      data-viewport-id={viewportId}
    >
      {shouldRenderPdfCanvas ? (
        <div
          className="pdf-canvas-viewer"
          aria-label="DICOM PDF document"
        >
          {pdfRenderStatus === 'loading' && <div className="pdf-canvas-status">Loading PDF...</div>}
          {pdfRenderStatus === 'error' && (
            <div className="pdf-canvas-status">
              PDF preview could not be rendered in this browser.
            </div>
          )}
          <div
            className="pdf-canvas-pages"
            ref={pdfCanvasContainerRef}
            data-pdf-error={pdfRenderError ? 'true' : undefined}
          />
        </div>
      ) : (
        <div
          className="pdf-viewport-inner"
          style={{
            transform: `rotate(${objectRotation}deg)`,
            width: isSideways ? '100vh' : '100%',
            height: isSideways ? '100vw' : '100%',
            transformOrigin: 'center center',
          }}
        >
          <object
            data={embeddedUrl}
            type="application/pdf"
            aria-label="DICOM PDF document"
            className={style}
          >
            <div className="pdf-object-fallback">
              <div>PDF preview is not available in this browser.</div>
            </div>
          </object>
        </div>
      )}
    </div>
  );
}

OHIFCornerstonePdfViewport.propTypes = {
  displaySets: PropTypes.arrayOf(PropTypes.object).isRequired,
  viewportId: PropTypes.string,
};

export default OHIFCornerstonePdfViewport;
