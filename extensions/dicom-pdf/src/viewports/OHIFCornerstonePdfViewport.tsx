import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useViewportRef } from '@ohif/core';
import './OHIFCornerstonePdfViewport.css';

function OHIFCornerstonePdfViewport({ displaySets, viewportId = 'pdf-viewport' }) {
  const [url, setUrl] = useState(null);
  const [autoRotation, setAutoRotation] = useState(0);
  const containerRef = useRef(null);
  const viewportElementRef = useRef(null);
  const viewportRef = useViewportRef(viewportId);

  useEffect(() => {
    document.body.addEventListener('drag', makePdfDropTarget);
    return function cleanup() {
      document.body.removeEventListener('drag', makePdfDropTarget);
      viewportRef.unregister();
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

  const isSideways = autoRotation === 90 || autoRotation === 270;

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
          data={url}
          type="application/pdf"
          className={style}
        >
          <div>No online PDF viewer installed</div>
        </object>
      </div>
    </div>
  );
}

OHIFCornerstonePdfViewport.propTypes = {
  displaySets: PropTypes.arrayOf(PropTypes.object).isRequired,
  viewportId: PropTypes.string,
};

export default OHIFCornerstonePdfViewport;
