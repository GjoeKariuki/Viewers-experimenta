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

function getPublicAssetPath(path) {
  const publicUrl = (process.env.PUBLIC_URL || '/').replace(/\/?$/, '/');
  const cleanPath = path.replace(/^\/+/, '');

  return `${publicUrl}${cleanPath}`;
}

function getPdfJsViewerUrl(url) {
  const viewerUrl = getPublicAssetPath('pdfjs/web/viewer.html');

  if (!url) {
    return `${viewerUrl}?file=#zoom=page-width`;
  }

  return `${viewerUrl}?file=${encodeURIComponent(url)}#zoom=page-width`;
}

function PdfJsViewerFrame({ url }) {
  const iframeRef = useRef(null);
  const pdfDataRef = useRef(null);
  const [loadState, setLoadState] = useState({ isLoading: true, error: '' });
  const viewerUrl = getPdfJsViewerUrl('');

  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    pdfDataRef.current = null;
    setLoadState({ isLoading: true, error: '' });

    async function loadPdfData() {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load PDF. Request failed with status ${response.status}.`);
        }

        const pdfData = await response.arrayBuffer();

        if (isCancelled) {
          return;
        }

        pdfDataRef.current = pdfData;
        setLoadState({ isLoading: false, error: '' });
        postPdfDataToViewer();
      } catch (error) {
        if (isCancelled || abortController.signal.aborted) {
          return;
        }

        setLoadState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to load this PDF.',
        });
      }
    }

    loadPdfData();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [url]);

  useEffect(() => {
    const handleViewerMessage = event => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === 'ohif-pdfjs-viewer-ready') {
        postPdfDataToViewer();
      }
    };

    window.addEventListener('message', handleViewerMessage);

    return () => {
      window.removeEventListener('message', handleViewerMessage);
    };
  }, []);

  const postPdfDataToViewer = () => {
    const pdfData = pdfDataRef.current;
    const targetWindow = iframeRef.current?.contentWindow;

    if (!pdfData || !targetWindow) {
      return;
    }

    targetWindow.postMessage(
      {
        type: 'ohif-open-pdf-data',
        pdfData,
        fileName: 'dicom-document.pdf',
      },
      window.location.origin
    );
  };

  return (
    <>
      {loadState.isLoading && <div className="pdf-status">Loading PDF...</div>}
      {loadState.error && <div className="pdf-status">{loadState.error}</div>}
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        title="DICOM PDF document"
        className="pdfjs-viewer-frame"
        allow="fullscreen"
        onLoad={postPdfDataToViewer}
      />
    </>
  );
}

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
  const [usePdfJsPreview, setUsePdfJsPreview] = useState(shouldUsePdfJsPreview);
  const containerRef = useRef(null);
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
        {usePdfJsPreview && url ? (
          <PdfJsViewerFrame url={url} />
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
