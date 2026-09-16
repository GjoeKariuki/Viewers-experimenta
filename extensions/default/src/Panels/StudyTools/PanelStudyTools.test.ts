import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PanelStudyTools from './PanelStudyTools';
import { createStudyArchive, saveStudyArchive } from './downloadStudy';
import { useActiveViewportDisplaySets, setViewerPrivacy } from '@ohif/core';

jest.mock('@ohif/core', () => ({
  useActiveViewportDisplaySets: jest.fn(),
  useViewerPrivacy: () => false,
  setViewerPrivacy: jest.fn(),
}));
jest.mock('./downloadStudy', () => ({
  createStudyArchive: jest.fn(),
  saveStudyArchive: jest.fn(),
}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

it('downloads the active study, reports failures, and toggles privacy', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const dataSource = { retrieve: { study: jest.fn() } };
  const extensionManager = { getActiveDataSource: () => [dataSource] };
  (useActiveViewportDisplaySets as jest.Mock).mockReturnValue([{ StudyInstanceUID: '1.2.3' }]);
  act(() => root.render(React.createElement(PanelStudyTools, { extensionManager })));
  const archive = new Uint8Array([1]);
  (createStudyArchive as jest.Mock).mockResolvedValue(archive);
  await act(async () => container.querySelector('button').click());
  expect(createStudyArchive).toHaveBeenCalledWith(dataSource, '1.2.3');
  expect(saveStudyArchive).toHaveBeenCalledWith(archive);
  expect(container.textContent).toContain('download started');
  (createStudyArchive as jest.Mock).mockRejectedValue(new Error('Permission denied'));
  await act(async () => container.querySelector('button').click());
  expect(container.querySelector('[role="status"]').textContent).toBe('Permission denied');
  expect(container.querySelector('button').disabled).toBe(false);
  act(() => container.querySelector('input').click());
  expect(setViewerPrivacy).toHaveBeenCalledWith(true);
  (useActiveViewportDisplaySets as jest.Mock).mockReturnValue([]);
  act(() => root.render(React.createElement(PanelStudyTools, { extensionManager })));
  expect(container.querySelector('button').disabled).toBe(true);
  act(() => root.unmount());
});

it('does not request restricted files from a source with downloads disabled', () => {
  jest.clearAllMocks();
  const container = document.createElement('div');
  const root = createRoot(container);
  const dataSource = {
    retrieve: { study: jest.fn() },
    getConfig: () => ({
      supportsStudyDownload: false,
      studyDownloadUnavailableReason: 'This sample server does not provide DICOM study downloads.',
    }),
  };
  (useActiveViewportDisplaySets as jest.Mock).mockReturnValue([{ StudyInstanceUID: '1.2.3' }]);
  act(() =>
    root.render(
      React.createElement(PanelStudyTools, {
        extensionManager: { getActiveDataSource: () => [dataSource] },
      })
    )
  );
  expect(container.querySelector('button').disabled).toBe(true);
  expect(container.textContent).toContain(
    'This sample server does not provide DICOM study downloads.'
  );
  act(() => container.querySelector('button').click());
  expect(createStudyArchive).not.toHaveBeenCalled();
  act(() => root.unmount());
});
