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
      className="viewer-layout__toolbar-panel-buttons flex items-center gap-1"
      aria-label="Viewer panels"
    >
      {panels.map(panel => (
        <Button
          key={panel.id}
          type="button"
          variant="ghost"
          size="icon"
          className={`text-primary hover:bg-primary/25 ${
            activePanelId === panel.id ? 'bg-primary/25' : ''
          }`}
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
