import { PROJECTION_MODES, blendModeToProjectionMode } from '../utils/projectionUtils';

function getProjectionModeLabel(viewportId, servicesManager) {
  const cornerstoneViewportService = servicesManager?.services?.cornerstoneViewportService;
  if (!cornerstoneViewportService || !viewportId) {
    return null;
  }

  const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

  if (!viewport?.getBlendMode) {
    return null;
  }

  const mode = blendModeToProjectionMode(viewport.getBlendMode());

  switch (mode) {
    case PROJECTION_MODES.MIP:
      return 'MIP';
    case PROJECTION_MODES.MINIP:
      return 'MinIP';
    case PROJECTION_MODES.AVG:
      return 'AvgIP';
    default:
      return null;
  }
}

export default {
  'viewportOverlay.topLeft': [
    {
      id: 'StudyDate',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Study date',
      condition: ({ referenceInstance }) => referenceInstance?.StudyDate,
      contentF: ({ referenceInstance, formatters: { formatDate } }) =>
        formatDate(referenceInstance.StudyDate),
    },
    {
      id: 'SeriesTime',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Series time',
      condition: ({ referenceInstance, displaySet }) =>
        referenceInstance?.SeriesTime || displaySet?.SeriesTime || referenceInstance?.StudyTime,
      contentF: ({ referenceInstance, displaySet, formatters: { formatTime } }) =>
        formatTime(
          referenceInstance?.SeriesTime || displaySet?.SeriesTime || referenceInstance?.StudyTime
        ),
    },
    {
      id: 'SeriesDescription',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Series description',
      condition: ({ referenceInstance }) => {
        return referenceInstance && referenceInstance.SeriesDescription;
      },
      contentF: ({ referenceInstance }) => referenceInstance.SeriesDescription,
    },
  ],
  'viewportOverlay.topRight': [
    {
      id: 'ProjectionMode',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Projection mode',
      condition: ({ viewportId, servicesManager }) =>
        !!getProjectionModeLabel(viewportId, servicesManager),
      contentF: ({ viewportId, servicesManager }) =>
        getProjectionModeLabel(viewportId, servicesManager),
    },
  ],
  'viewportOverlay.bottomLeft': [
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
    },
    {
      id: 'ZoomLevel',
      inheritsFrom: 'ohif.overlayItem.zoomLevel',
      condition: props => {
        const activeToolName = props.toolGroupService.getActiveToolForViewport(props.viewportId);
        return activeToolName === 'Zoom';
      },
    },
  ],
  'viewportOverlay.bottomRight': [
    {
      id: 'InstanceNumber',
      inheritsFrom: 'ohif.overlayItem.instanceNumber',
    },
  ],
  'viewportOverlay.bottomCenter': [
    {
      id: 'StudyDescription',
      inheritsFrom: 'ohif.overlayItem',
      label: '',
      title: 'Study description',
      condition: ({ referenceInstance, displaySet }) =>
        referenceInstance?.StudyDescription || displaySet?.StudyDescription,
      contentF: ({ referenceInstance, displaySet }) =>
        referenceInstance?.StudyDescription || displaySet?.StudyDescription,
    },
  ],
};
