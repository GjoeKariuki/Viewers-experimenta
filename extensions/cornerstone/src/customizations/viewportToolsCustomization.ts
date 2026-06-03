import { Enums } from '@cornerstonejs/tools';
import { toolNames } from '../initCornerstoneTools';

const noDefaultBindings = [];

export default {
  'cornerstone.overlayViewportTools': {
    active: [
      {
        toolName: toolNames.WindowLevel,
        bindings: [{ mouseButton: Enums.MouseBindings.Primary }],
      },
      {
        toolName: toolNames.Pan,
        bindings: noDefaultBindings,
      },
      {
        toolName: toolNames.Zoom,
        bindings: noDefaultBindings,
      },
      {
        toolName: toolNames.StackScroll,
        bindings: [{ mouseButton: Enums.MouseBindings.Wheel }, { numTouchPoints: 3 }],
      },
    ],
    enabled: [
      {
        toolName: toolNames.PlanarFreehandContourSegmentation,
        configuration: {
          displayOnePointAsCrosshairs: true,
        },
      },
    ],
  },
};
