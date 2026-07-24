import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import './OHIFCornerstonePdfViewport.css';

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function hasPdfSignature(data: Uint8Array) {
  const headerLength = Math.min(data.length - PDF_SIGNATURE.length + 1, 1024);

  for (let offset = 0; offset < headerLength; offset++) {
    if (PDF_SIGNATURE.every((byte, index) => data[offset + index] === byte)) {
      return true;
    }
  }

  return false;
}

function getPdfJsViewerUrl(pdfObjectUrl: string) {
  const publicUrl = (window as typeof window & { PUBLIC_URL?: string }).PUBLIC_URL || '/';
  const publicBaseUrl = new URL(
    publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`,
    window.location.origin
  );
  const viewerUrl = new URL('pdfjs/web/viewer.html', publicBaseUrl);

  viewerUrl.searchParams.set('file', pdfObjectUrl);

  return viewerUrl.toString();
}

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [pdfJsViewerUrl, setPdfJsViewerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    let pdfObjectUrl: string | null = null;
    const controller = new AbortController();

    setPdfJsViewerUrl(null);
    setError(null);

    const load = async () => {
      try {
        const url = await renderedUrl;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            Accept: 'application/pdf',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`The PDF request failed with HTTP ${response.status}.`);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());

        if (!hasPdfSignature(bytes)) {
          throw new Error(
            'The document server did not return a PDF. Please sign in again and try reopening the document.'
          );
        }

        pdfObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));

        if (!cancelled) {
          setPdfJsViewerUrl(getPdfJsViewerUrl(pdfObjectUrl));
        }
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        console.warn('Unable to load DICOM PDF into PDF.js', error);
        setError(error instanceof Error ? error.message : 'Unable to load this PDF document.');
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [renderedUrl]);

  return (
    <div
      className="bg-background pdf-viewport-outer text-foreground"
      ref={el => {
        if (el) viewportRef.register(el);
      }}
      data-viewport-id={viewportId}
    >
      <div className="pdf-viewport-inner">
        {pdfJsViewerUrl ? (
          <iframe
            src={pdfJsViewerUrl}
            title="DICOM PDF document"
            className="pdfjs-viewer"
            allow="fullscreen"
          />
        ) : error ? (
          <div
            className="pdf-status"
            role="alert"
          >
            {error}
          </div>
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
