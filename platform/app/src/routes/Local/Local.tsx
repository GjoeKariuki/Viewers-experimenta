import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES, useSystem } from '@ohif/core';

import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';

import { extensionManager } from '../../App';

import { Button, Icons } from '@ohif/ui-next';

const getLoadButton = (onDrop, text, isDir, disabled) => {
  return (
    <Dropzone
      onDrop={onDrop}
      noDrag
      disabled={disabled}
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <Button
            variant="default"
            className="min-w-28"
            disabled={disabled}
            onClick={() => {}}
          >
            {text}
            {isDir ? (
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
                style={{ display: 'none' }}
              />
            ) : (
              <input
                {...getInputProps()}
                style={{ display: 'none' }}
              />
            )}
          </Button>
        </div>
      )}
    </Dropzone>
  );
};

type LocalProps = {
  modePath: string;
};

function Local({ modePath }: LocalProps) {
  const { servicesManager } = useSystem();
  const { customizationService } = servicesManager.services;
  const navigate = useNavigate();
  const location = useLocation();
  const loadController = useRef<AbortController | null>(null);

  const closeLoader = () => {
    loadController.current?.abort();
    const returnTo = location.state?.returnTo;
    navigate(
      typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/',
      { replace: true }
    );
  };
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const loadingRef = useRef(false);

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  firstLocalDataSource.createDataSource({});

  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );

  const openStudies = async (acceptedFiles, signal: AbortSignal) => {
    const studies = await filesToStudies(acceptedFiles, signal);
    if (signal.aborted) {
      return;
    }
    if (!studies.length) {
      throw new Error(
        'No readable DICOM studies found. Select the disc’s root folder, including its subfolders. DICOMDIR alone does not contain the study images.'
      );
    }

    const query = new URLSearchParams();

    if (microscopyExtensionLoaded) {
      // TODO: for microscopy, we are forcing microscopy mode, which is not ideal.
      //     we should make the local drag and drop navigate to the worklist and
      //     there user can select microscopy mode
      const smStudies = studies.filter(id => {
        const study = DicomMetadataStore.getStudy(id);
        return (
          study.series.findIndex(s => s.Modality === 'SM' || s.instances[0].Modality === 'SM') >= 0
        );
      });

      if (smStudies.length > 0) {
        smStudies.forEach(id => query.append('StudyInstanceUIDs', id));

        modePath = 'microscopy';
      }
    }

    // Todo: navigate to work list and let user select a mode
    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    query.append('datasources', 'dicomlocal');

    navigate(`/${modePath}?${decodeURIComponent(query.toString())}`);
  };

  const onDrop = async acceptedFiles => {
    if (loadingRef.current || !acceptedFiles.length) {
      return;
    }
    const controller = new AbortController();
    loadController.current = controller;
    loadingRef.current = true;
    setDropInitiated(true);
    setLoadError('');
    try {
      await openStudies(acceptedFiles, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to read the selected studies.'
        );
      }
    } finally {
      loadingRef.current = false;
      if (!controller.signal.aborted) {
        setDropInitiated(false);
      }
    }
  };

  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      loadController.current?.abort();
      document.body.classList.remove('bg-black');
    };
  }, []);

  return (
    <Dropzone
      ref={dropzoneRef}
      onDrop={onDrop}
      disabled={dropInitiated}
      noClick
    >
      {({ getRootProps }) => (
        <div
          {...getRootProps()}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="flex h-screen w-screen items-center justify-center">
            <div className="bg-muted border-primary/60 relative mx-auto space-y-2 rounded-xl border border-dashed py-12 px-12 drop-shadow-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3"
                aria-label="Close disc loader"
                title="Close disc loader"
                onClick={closeLoader}
              >
                <Icons.Close aria-hidden="true" />
              </Button>
              <div className="space-y-2 py-6 text-center">
                {dropInitiated ? (
                  <div className="flex flex-col items-center justify-center pt-12">
                    <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-primary pt-0 text-xl">
                      Drag and drop your DICOM files & folders here <br />
                      to load them locally.
                    </p>
                    <p className="text-muted-foreground text-base">
                      Note: Your data remains locally within your browser
                      <br /> and is never uploaded to any server.
                    </p>
                  </div>
                )}
              </div>
              {loadError && (
                <p
                  role="alert"
                  className="text-destructive max-w-xl text-center"
                >
                  {loadError}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {getLoadButton(onDrop, 'Open CD/DVD', true, dropInitiated)}
                {getLoadButton(onDrop, 'Load files', false, dropInitiated)}
                {getLoadButton(onDrop, 'Load folders', true, dropInitiated)}
                <Button
                  variant="ghost"
                  onClick={closeLoader}
                >
                  {dropInitiated ? 'Cancel loading' : 'Cancel'}
                </Button>
              </div>
              <p className="text-muted-foreground max-w-xl pt-2 text-center text-sm">
                For CD/DVD studies, insert the disc and select its root folder in the folder picker.
                All subfolders are included. Keep the disc inserted while viewing.
              </p>
            </div>
          </div>
        </div>
      )}
    </Dropzone>
  );
}

export default Local;
