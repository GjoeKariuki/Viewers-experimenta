import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import './OHIFCornerstonePdfViewport.css';

const mobilePdfPreviewMediaQuery = '(hover: none), (pointer: coarse), (max-width: 767px)';

function shouldUsePdfJsPreview() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(mobilePdfPreviewMediaQuery).matches
  );
}

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
  const [loadState, setLoadState] = useState({ isLoading: true, error: '' });
  const [containerWidth, setContainerWidth] = useState(0);
  const [usePdfJsPreview, setUsePdfJsPreview] = useState(shouldUsePdfJsPreview);
  const containerRef = useRef(null);
  const pagesRef = useRef(null);
  const viewportElementRef = useRef(null);
  const viewportRef = useViewportRef(viewportId);

  useEffect(() => {
    return function cleanup() {
      viewportRef.unregister();
    };
  }, []);

  if (displaySets && displaySets.length > 1) {
    throw new Error(
      'OHIFCornerstonePdfViewport: only one display set is supported for dicom pdf right now'
    );
  }

  const { renderedUrl } = displaySets[0];

  useEffect(() => {
    let cancelled = false;

    setUrl(null);

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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(mobilePdfPreviewMediaQuery);
    const syncPreviewMode = () => {
      setUsePdfJsPreview(mediaQuery.matches);
    };

    syncPreviewMode();
    mediaQuery.addEventListener?.('change', syncPreviewMode);

    return () => {
      mediaQuery.removeEventListener?.('change', syncPreviewMode);
    };
  }, []);

  useEffect(() => {
    const pagesElement = pagesRef.current;

    if (!usePdfJsPreview || !pagesElement) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      setContainerWidth(pagesElement.clientWidth);
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      const width = Math.floor(entries[0]?.contentRect?.width || 0);

      setContainerWidth(width);
    });

    resizeObserver.observe(pagesElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [usePdfJsPreview]);

  useEffect(() => {
    const pagesElement = pagesRef.current;

    if (!usePdfJsPreview) {
      pagesElement?.replaceChildren();
      setLoadState({ isLoading: false, error: '' });
      return;
    }

    if (!url || !pagesElement || !containerWidth) {
      return;
    }

    let isCancelled = false;
    const renderTasks = [];
    let loadingTask = null;
    let pdfDocument = null;

    pagesElement.innerHTML = '';
    setLoadState({ isLoading: true, error: '' });

    async function renderPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist/webpack');

        if (isCancelled) {
          return;
        }

        loadingTask = pdfjsLib.getDocument({ url });
        pdfDocument = await loadingTask.promise;
        const pageWrapperWidth = Math.max(containerWidth - 32, 160);

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
          if (isCancelled) {
            break;
          }

          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.max(0.25, Math.min(pageWrapperWidth / baseViewport.width, 2.5));
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;
          const pageElement = document.createElement('div');
          const canvas = document.createElement('canvas');
          const canvasContext = canvas.getContext('2d');

          if (!canvasContext) {
            throw new Error('Unable to render PDF page.');
          }

          pageElement.className = 'pdfjs-page';
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.setAttribute('aria-label', `PDF page ${pageNumber}`);
          pageElement.appendChild(canvas);
          pagesElement.appendChild(pageElement);

          const renderTask = page.render({
            canvasContext,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          });

          renderTasks.push(renderTask);
          await renderTask.promise;
        }

        if (!isCancelled) {
          setLoadState({ isLoading: false, error: '' });
        }
      } catch (error) {
        const errorName =
          error && typeof error === 'object' && 'name' in error
            ? String((error as { name?: unknown }).name)
            : '';

        if (isCancelled || errorName === 'RenderingCancelledException') {
          return;
        }

        setLoadState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to render this PDF.',
        });
      }
    }

    renderPdf();

    return () => {
      isCancelled = true;
      renderTasks.forEach(renderTask => renderTask.cancel());
      loadingTask?.destroy();
      pdfDocument?.destroy?.();
      pagesElement.innerHTML = '';
    };
  }, [containerWidth, url, usePdfJsPreview]);

  const embeddedUrl = url ? `${url}#toolbar=1&navpanes=0&scrollbar=1` : undefined;

  return (
    <div
      className="bg-background pdf-viewport-outer text-foreground"
      ref={el => {
        containerRef.current = el;
        viewportElementRef.current = el;
        if (el) viewportRef.register(el);
      }}
      data-viewport-id={viewportId}
    >
      <div className="pdf-viewport-inner">
        {usePdfJsPreview ? (
          <>
            {loadState.isLoading && <div className="pdf-status">Loading PDF...</div>}
            {loadState.error && <div className="pdf-status">{loadState.error}</div>}
            <div
              ref={pagesRef}
              className="pdfjs-pages"
              aria-label="DICOM PDF document"
            />
          </>
        ) : embeddedUrl ? (
          <object
            data={embeddedUrl}
            type="application/pdf"
            aria-label="DICOM PDF document"
            className="pdf-browser-preview"
          >
            <div className="pdf-status">
              <div>PDF preview is not available in this browser.</div>
            </div>
          </object>
        ) : (
          <div className="pdf-status">Loading PDF...</div>
        )}
      </div>
    </div>
  );
}

OHIFCornerstonePdfViewport.propTypes = {
  displaySets: PropTypes.arrayOf(PropTypes.object).isRequired,
  viewportId: PropTypes.string,
};

export default OHIFCornerstonePdfViewport;
