import getContextModule from './getContextModule.js';
import getDataSourcesModule from './getDataSourcesModule.js';
import getLayoutTemplateModule from './getLayoutTemplateModule.js';
import getPanelModule from './getPanelModule.js';
import getSopClassHandlerModule from './getSopClassHandlerModule.js';
import getHangingProtocolModule from './getHangingProtocolModule.js';
import getToolbarModule from './getToolbarModule.js';
import commandsModule from './commandsModule';
import id from './id';

export default {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,
  getContextModule,
  getDataSourcesModule,
  getHangingProtocolModule,
  getLayoutTemplateModule,
  getPanelModule,
  getSopClassHandlerModule,
  getToolbarModule,
  getCommandsModule({ servicesManager, commandsManager }) {
    return commandsModule({ servicesManager, commandsManager });
  },
};
