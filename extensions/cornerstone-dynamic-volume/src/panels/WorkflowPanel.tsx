import React from 'react';
import type { ServicesManager } from '@ohif/core';

function WorkflowPanel({ servicesManager }: { servicesManager: ServicesManager }) {
  const ProgressDropdownWithService =
    servicesManager.services.customizationService.getCustomization(
      'progressDropdownWithServiceComponent'
    );

  return (
    <div
      data-cy={'workflow-panel'}
      className="bg-muted text-foreground mb-1 px-3 py-4"
    >
      <div className="mb-1 text-sm font-medium">Workflow</div>
      <div>
        <ProgressDropdownWithService servicesManager={servicesManager} />
      </div>
    </div>
  );
}

export default WorkflowPanel;
