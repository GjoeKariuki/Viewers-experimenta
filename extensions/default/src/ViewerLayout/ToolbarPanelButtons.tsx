import React, { useEffect, useState } from 'react';
import { Button, Icons } from '@ohif/ui-next';

function ToolbarPanelButtons({
  servicesManager,
  activePanelId,
  onPanelSelect,
}: withAppTypes<{
  activePanelId?: string;
  onPanelSelect: (panel) => void;
}>) {
  const { panelService } = servicesManager.services;
  const [panels, setPanels] = useState(() =>
    panelService.getPanels(panelService.PanelPosition.Right)
  );

  useEffect(() => {
    const { unsubscribe } = panelService.subscribe(
      panelService.EVENTS.PANELS_CHANGED,
      ({ position }) => {
        if (position === panelService.PanelPosition.Right) {
          setPanels(panelService.getPanels(panelService.PanelPosition.Right));
        }
      }
    );

    return () => unsubscribe();
  }, [panelService]);

  if (!panels.length) {
    return null;
  }

  return (
    <div
      className="viewer-layout__toolbar-panel-buttons border-border ml-3 flex shrink-0 items-center gap-2 border-l pl-3"
      aria-label="Viewer panels"
    >
      {panels.map(panel => (
        <Button
          key={panel.id}
          type="button"
          variant="ghost"
          size="icon"
          className={`viewer-layout__toolbar-panel-button text-primary hover:bg-primary/25 ${
            panel.name === 'studyReports' ? 'viewer-layout__toolbar-panel-button--reports' : ''
          } ${activePanelId === panel.id ? 'bg-primary/25' : ''}`}
          title={panel.label}
          aria-label={panel.label}
          onClick={() => onPanelSelect(panel)}
        >
          <Icons.ByName name={panel.iconName} />
        </Button>
      ))}
    </div>
  );
}

export default ToolbarPanelButtons;
