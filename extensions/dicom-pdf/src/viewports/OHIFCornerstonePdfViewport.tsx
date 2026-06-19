import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import './OHIFCornerstonePdfViewport.css';

const pdfCanvasMediaQuery = '(hover: none), (pointer: coarse), (max-width: 767px)';
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

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
  const [autoRotation, setAutoRotation] = useState(0);
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
    const load = async () => {
      setUrl(await renderedUrl);
    };

    load();
  }, [renderedUrl]);

  // Detect the PDF page /Rotate value from the raw bytes and counter-rotate
  useEffect(() => {
    if (!url) return;
    const detectRotation = async () => {
      try {
        const response = await fetch(url, { headers: { Range: 'bytes=0-32767' } });
        const buffer = await response.arrayBuffer();
        // PDF stores rotation as plain ASCII: /Rotate <number>
        const text = new TextDecoder('latin1').decode(buffer);
        const match = text.match(/\/Rotate\s+(\d+)/);
        if (match) {
          const pdfRotate = parseInt(match[1], 10) % 360;
          // Counter-rotate so content reads upright
          setAutoRotation(pdfRotate > 0 ? 360 - pdfRotate : 0);
        } else {
          setAutoRotation(0);
        }
      } catch {
        setAutoRotation(0);
      }
    };
    detectRotation();
  }, [url]);

  useEffect(() => {
    if (!url || !usePdfCanvas) {
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

      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) {
            break;
          }

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(pagesContainer.clientWidth - 24, 320);
          const scale = Math.min(2.5, availableWidth / baseViewport.width);
          const viewport = page.getViewport({ scale });
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
          pageElement.appendChild(canvas);
          pagesContainer.appendChild(pageElement);

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
  }, [url, usePdfCanvas]);

  const isSideways = autoRotation === 90 || autoRotation === 270;
  const embeddedUrl = url ? `${url}#toolbar=1&navpanes=0&scrollbar=1` : undefined;

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
      {usePdfCanvas ? (
        <div
          className="pdf-canvas-viewer"
          aria-label="DICOM PDF document"
        >
          {pdfRenderStatus === 'loading' && (
            <div className="pdf-canvas-status">Loading PDF...</div>
          )}
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
            transform: `rotate(${autoRotation}deg)`,
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
