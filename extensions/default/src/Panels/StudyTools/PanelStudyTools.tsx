import React, { useEffect, useRef, useState } from 'react';
import { useActiveViewportDisplaySets, useViewerPrivacy, setViewerPrivacy } from '@ohif/core';
import { createStudyArchive, saveStudyArchive } from './downloadStudy';

export default function PanelStudyTools({ extensionManager }) {
  const displaySets = useActiveViewportDisplaySets();
  const privacy = useViewerPrivacy();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const downloading = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const studies = [...new Set(displaySets.map(ds => ds.StudyInstanceUID).filter(Boolean))];
  const studyInstanceUID = studies.length === 1 ? studies[0] : undefined;
  const dataSource = extensionManager.getActiveDataSource()?.[0];
  const config = dataSource?.getConfig?.();
  const supported = !!dataSource?.retrieve?.study && config?.supportsStudyDownload !== false;

  useEffect(() => {
    setMessage('');
  }, [studyInstanceUID]);

  const download = async () => {
    if (!supported || !studyInstanceUID || downloading.current) {
      return;
    }
    downloading.current = true;
    setBusy(true);
    setMessage('Retrieving all DICOM instances and preparing ZIP…');
    try {
      const archive = await createStudyArchive(dataSource, studyInstanceUID);
      saveStudyArchive(archive);
      if (mounted.current) {
        setMessage('Study ZIP download started.');
      }
    } catch (error) {
      if (mounted.current) {
        setMessage(error instanceof Error ? error.message : 'Unable to download this study.');
      }
    } finally {
      downloading.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  return (
    <div className="text-foreground space-y-4">
      <section className="space-y-2">
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded px-3 py-2 text-sm disabled:opacity-50"
          disabled={busy || !studyInstanceUID || !supported}
          onClick={download}
        >
          {busy ? 'Preparing download…' : 'Download study ZIP'}
        </button>
        {!studyInstanceUID && (
          <p className="text-muted-foreground text-xs">Select a viewport containing one study.</p>
        )}
        {!supported && (
          <p className="text-muted-foreground text-xs">
            {config?.studyDownloadUnavailableReason ||
              'Study download is unavailable for this data source.'}
          </p>
        )}
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground text-xs"
        >
          {message}
        </p>
      </section>
      <section className="border-border space-y-2 border-t pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacy}
            onChange={event => setViewerPrivacy(event.target.checked)}
          />
          Hide patient information
        </label>
      </section>
    </div>
  );
}
