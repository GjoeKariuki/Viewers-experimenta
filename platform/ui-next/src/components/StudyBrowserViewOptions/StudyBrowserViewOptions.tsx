import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../DropdownMenu/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';

export function StudyBrowserViewOptions({ tabs, onSelectTab, activeTabName }: withAppTypes) {
  const handleTabChange = (tabName: string) => {
    onSelectTab(tabName);
  };

  const activeTab = tabs.find(tab => tab.name === activeTabName);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger className="w-[50%] overflow-hidden">
          <DropdownMenuTrigger className="border-border bg-popover text-popover-foreground focus:border-border flex h-[26px] w-full items-center justify-start rounded border p-2 text-base hover:bg-accent">
            {activeTab?.label}
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{activeTab?.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="bg-popover text-popover-foreground border-border border">
        {tabs.map(tab => {
          const { name, label, studies } = tab;
          const isActive = activeTabName === name;
          const isDisabled = !studies.length;

          if (isDisabled) {
            return null;
          }

          return (
            <DropdownMenuItem
              key={name}
              className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground ${isActive ? 'font-bold text-primary' : ''}`}
              onClick={() => handleTabChange(name)}
            >
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
