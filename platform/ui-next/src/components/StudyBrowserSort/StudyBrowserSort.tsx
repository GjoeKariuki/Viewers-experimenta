import React, { useEffect, useState } from 'react';
import { Icons } from '../Icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../DropdownMenu/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';

export function StudyBrowserSort({ servicesManager }: withAppTypes) {
  // Todo: this should not be here, no servicesManager should be in ui-next, only
  // customization service
  const { customizationService, displaySetService } = servicesManager.services;
  const sortFunctions = customizationService.getCustomization('studyBrowser.sortFunctions');

  const [selectedSort, setSelectedSort] = useState(sortFunctions[0]);
  const [sortDirection, setSortDirection] = useState('ascending');

  const handleSortChange = sortFunction => {
    setSelectedSort(sortFunction);
  };

  const toggleSortDirection = e => {
    e.stopPropagation();
    setSortDirection(prevDirection => (prevDirection === 'ascending' ? 'descending' : 'ascending'));
  };

  useEffect(() => {
    displaySetService.sortDisplaySets(selectedSort.sortFunction, sortDirection);
  }, [displaySetService, selectedSort, sortDirection]);

  useEffect(() => {
    const SubscriptionDisplaySetsChanged = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      () => {
        displaySetService.sortDisplaySets(selectedSort.sortFunction, sortDirection, true);
      }
    );
    const SubscriptionDisplaySetMetaDataInvalidated = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      () => {
        displaySetService.sortDisplaySets(selectedSort.sortFunction, sortDirection, true);
      }
    );

    return () => {
      SubscriptionDisplaySetsChanged.unsubscribe();
      SubscriptionDisplaySetMetaDataInvalidated.unsubscribe();
    };
  }, [displaySetService, selectedSort, sortDirection]);

  return (
    <div className="flex w-[50%] items-center gap-1">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger className="w-full overflow-hidden">
            <DropdownMenuTrigger className="border-border bg-popover text-popover-foreground focus:border-border flex h-[26px] w-full items-center justify-start overflow-hidden whitespace-nowrap rounded border p-2 text-base hover:bg-accent">
              {selectedSort.label}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{selectedSort.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="bg-popover text-popover-foreground border-border border">
          {sortFunctions.map(sort => (
            <DropdownMenuItem
              key={sort.label}
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleSortChange(sort)}
            >
              {sort.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger>
          <button
            onClick={toggleSortDirection}
            className="border-border bg-popover text-foreground flex h-[26px] items-center justify-center rounded border hover:bg-accent"
          >
            {sortDirection === 'ascending' ? (
              <Icons.SortingAscending className="text-primary w-2" />
            ) : (
              <Icons.SortingDescending className="text-primary w-2" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>Sort direction</TooltipContent>
      </Tooltip>
    </div>
  );
}
