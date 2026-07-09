import React from 'react';
import {
  Icons,
  StudyBrowserSort,
  StudyBrowserViewOptions,
  ToggleGroup,
  ToggleGroupItem,
} from '@ohif/ui-next';
import { actionIcon, viewPreset } from './types';
import { type TabsProps } from '@ohif/core/src/utils/createStudyBrowserTabs';

function PanelStudyBrowserHeader({
  viewPresets,
  updateViewPresetValue,
  actionIcons,
  updateActionIconValue,
  tabs,
  activeTabName,
  onClickTab,
  servicesManager,
  showSettingsControls = false,
  showSidePanelControls = false,
  sidePanel,
}: {
  viewPresets: viewPreset[];
  updateViewPresetValue: (viewPreset: viewPreset) => void;
  actionIcons: actionIcon[];
  updateActionIconValue: (actionIcon: actionIcon) => void;
  tabs?: TabsProps;
  activeTabName?: string;
  onClickTab?: (tabName: string) => void;
  servicesManager?: AppTypes.ServicesManager;
  showSettingsControls?: boolean;
  showSidePanelControls?: boolean;
  sidePanel?: {
    isSingleTab?: boolean;
    label?: string;
    name?: string;
    onClose?: () => void;
    side?: 'left' | 'right';
  };
}) {
  const SidePanelCloseIcon =
    Icons[sidePanel?.side === 'right' ? 'SidePanelCloseRight' : 'SidePanelCloseLeft'] ||
    Icons.MissingIcon;

  // Button order: Settings button then List view mode (thumbnails vs. list)
  return (
    <>
      <div className="study-browser-panel-header bg-muted flex h-[40px] select-none rounded-t p-2">
        <div className={'flex h-[24px] w-full select-none justify-center self-center text-[14px]'}>
          <div className="study-browser-panel-header__content flex w-full items-center gap-[10px]">
            {showSidePanelControls && (
              <div
                className="study-browser-panel-header__title text-primary min-w-0 truncate text-[13px]"
                data-cy={`${sidePanel?.name || 'side-panel'}-combined-title`}
              >
                {sidePanel?.label}
              </div>
            )}
            {showSettingsControls && tabs && activeTabName && onClickTab && servicesManager && (
              <div className="study-browser-panel-header__settings flex min-w-0 flex-1 items-center gap-[8px]">
                <div className="study-browser-panel-header__study-filter min-w-0">
                  <StudyBrowserViewOptions
                    tabs={tabs}
                    onSelectTab={onClickTab}
                    activeTabName={activeTabName}
                  />
                </div>
                <div className="study-browser-panel-header__sort min-w-0">
                  <StudyBrowserSort servicesManager={servicesManager} />
                </div>
              </div>
            )}
            <div className="study-browser-panel-header__actions flex items-center justify-center">
              <div className="text-primary flex items-center space-x-1">
                {actionIcons.map((icon: actionIcon, index) =>
                  React.createElement(Icons[icon.iconName] || Icons.MissingIcon, {
                    key: index,
                    onClick: () => updateActionIconValue(icon),
                    className: `cursor-pointer`,
                  })
                )}
              </div>
            </div>
            <div className="study-browser-panel-header__view-presets ml-auto flex h-full items-center justify-center">
              <ToggleGroup
                type="single"
                value={viewPresets.filter(preset => preset.selected)[0].id}
                onValueChange={value => {
                  const selectedViewPreset = viewPresets.find(preset => preset.id === value);
                  updateViewPresetValue(selectedViewPreset);
                }}
              >
                {viewPresets.map((viewPreset: viewPreset, index) => (
                  <ToggleGroupItem
                    key={index}
                    aria-label={viewPreset.id}
                    value={viewPreset.id}
                    className="text-primary"
                  >
                    {React.createElement(Icons[viewPreset.iconName] || Icons.MissingIcon)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {showSidePanelControls && sidePanel?.onClose && (
              <button
                aria-label={`Close ${sidePanel?.label || 'panel'}`}
                className="study-browser-panel-header__close text-primary flex h-[24px] w-[28px] items-center justify-center"
                onClick={sidePanel.onClose}
                type="button"
              >
                <SidePanelCloseIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { PanelStudyBrowserHeader };
