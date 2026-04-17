import React, { ReactNode, useEffect } from 'react';
import { useSystem } from '@ohif/core';
import {
  Button,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useIconPresentation,
} from '@ohif/ui-next';
import ProjectionMenu from './ProjectionMenu';

type ProjectionMenuWrapperProps = {
  viewportId: string;
  location: string;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  disabled?: boolean;
};

export function ProjectionMenuWrapper(props: ProjectionMenuWrapperProps): ReactNode {
  const { viewportId, location, isOpen = false, onOpen, onClose, disabled, ...rest } = props;
  const { IconContainer, className: iconClassName, containerProps } = useIconPresentation();

  useEffect(() => {
    if (disabled && isOpen) {
      onClose?.();
    }
  }, [disabled, isOpen, onClose]);

  const handleOpenChange = (openState: boolean) => {
    if (openState) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const { servicesManager } = useSystem();
  const { toolbarService } = servicesManager.services;

  const { align, side } = toolbarService.getAlignAndSide(location);

  const Icon = (
    <Icons.ByName
      name="icon-mpr"
      className={iconClassName}
    />
  );

  const trigger = IconContainer ? (
    <IconContainer
      disabled={disabled}
      icon="icon-mpr"
      {...rest}
      {...containerProps}
    >
      {Icon}
    </IconContainer>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
    >
      {Icon}
    </Button>
  );

  if (disabled) {
    return trigger;
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger
        asChild
        className="flex items-center justify-center"
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        className="border-none bg-transparent p-0 shadow-none"
        side={side}
        align={align}
        alignOffset={0}
        sideOffset={5}
      >
        <ProjectionMenu
          className="w-full"
          viewportId={viewportId}
        />
      </PopoverContent>
    </Popover>
  );
}
