import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import './OHIFCornerstonePdfViewport.css';

function getPdfUrlWithFragment(url: string, fragment: string) {
  return `${url.split('#')[0]}#${fragment}`;
}

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
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

  const embeddedUrl = url
    ? getPdfUrlWithFragment(url, 'toolbar=1&navpanes=0&scrollbar=1&view=FitH')
    : undefined;

  return (
    <div
      className="bg-background pdf-viewport-outer text-foreground"
      ref={el => {
        if (el) viewportRef.register(el);
      }}
      data-viewport-id={viewportId}
    >
      <div className="pdf-viewport-inner">
        {embeddedUrl ? (
          <object
            data={embeddedUrl}
            type="application/pdf"
            aria-label="DICOM PDF document"
            className="pdf-browser-preview"
          >
            <div className="pdf-status">
              <div>PDF preview is not available in this browser.</div>
              <a
                className="pdf-open-link"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF
              </a>
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
