import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover/Popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../Tooltip';
import { Button } from '../Button';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';
import * as PropTypes from 'prop-types';

// Types
type LayoutCommandOptions = {
  numRows?: number;
  numCols?: number;
  protocolId?: string;
  [key: string]: any;
};

type LayoutPresetType = {
  title?: string;
  icon: string;
  commandOptions: LayoutCommandOptions;
  disabled?: boolean;
};

// Context
type LayoutSelectorContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelection: (commandOptions: LayoutCommandOptions) => void;
  onSelectionPreset: (commandOptions: LayoutCommandOptions) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  handleContentMouseEnter: () => void;
  handleContentMouseLeave: () => void;
  setTriggerNode: (node: HTMLElement | null) => void;
  setContentNode: (node: HTMLDivElement | null) => void;
};

const LayoutSelectorContext = createContext<LayoutSelectorContextType | undefined>(undefined);

const useLayoutSelector = () => {
  const context = useContext(LayoutSelectorContext);
  if (context === undefined) {
    throw new Error('useLayoutSelector must be used within a LayoutSelector component');
  }
  return context;
};

// Main component
type LayoutSelectorProps = {
  onSelectionChange?: (commandOptions: LayoutCommandOptions, isPreset: boolean) => void;
  onSelection?: (commandOptions: LayoutCommandOptions) => void;
  onSelectionPreset?: (commandOptions: LayoutCommandOptions) => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  tooltipDisabled?: boolean; // Keep this prop for now as it might be used elsewhere
};

const LayoutSelector = ({
  onSelectionChange,
  onSelection = commandOptions => {},
  onSelectionPreset = commandOptions => {},
  children,
  open,
  onOpenChange,
  tooltipDisabled,
}: LayoutSelectorProps) => {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : isOpenInternal;
  const setIsOpen = isControlled ? onOpenChange! : setIsOpenInternal;

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const isWithinSelector = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) {
      return false;
    }

    return triggerRef.current?.contains(target) || contentRef.current?.contains(target) || false;
  }, []);

  const openOnHover = useCallback(() => {
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout, setIsOpen]);

  const closeOnHoverLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 150);
  }, [clearCloseTimeout, setIsOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (isWithinSelector(event.target)) {
        clearCloseTimeout();
        return;
      }

      closeOnHoverLeave();
    };

    const handleWindowBlur = () => {
      clearCloseTimeout();
      setIsOpen(false);
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isOpen, clearCloseTimeout, closeOnHoverLeave, isWithinSelector, setIsOpen]);

  const handleSelection = useCallback(
    (commandOptions: LayoutCommandOptions) => {
      onSelection(commandOptions);
      if (onSelectionChange) {
        onSelectionChange(commandOptions, false);
      }
      setIsOpen(false);
    },
    [onSelection, onSelectionChange, setIsOpen]
  );

  const handlePresetSelection = useCallback(
    (commandOptions: LayoutCommandOptions) => {
      onSelectionPreset(commandOptions);
      if (onSelectionChange) {
        onSelectionChange(commandOptions, true);
      }
      setIsOpen(false);
    },
    [onSelectionPreset, onSelectionChange, setIsOpen]
  );

  return (
    <LayoutSelectorContext.Provider
      value={{
        isOpen,
        setIsOpen,
        onSelection: handleSelection,
        onSelectionPreset: handlePresetSelection,
        handleTriggerMouseEnter: openOnHover,
        handleTriggerMouseLeave: closeOnHoverLeave,
        handleContentMouseEnter: clearCloseTimeout,
        handleContentMouseLeave: closeOnHoverLeave,
        setTriggerNode: node => {
          triggerRef.current = node;
        },
        setContentNode: node => {
          contentRef.current = node;
        },
      }}
    >
      <Popover
        modal={false}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        {children}
      </Popover>
    </LayoutSelectorContext.Provider>
  );
};

// Sub-components
type TriggerProps = {
  children?: React.ReactNode;
  className?: string;
  tooltip?: string;
  disabled?: boolean;
  disabledText?: string;
};

const Trigger = ({
  children,
  className,
  tooltip = 'Change layout',
  disabled = false,
  disabledText,
}: TriggerProps) => {
  const {
    isOpen,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    setTriggerNode,
  } = useLayoutSelector();

  const hasTooltip = tooltip || (disabled && disabledText);
  const handleMouseEnter = () => {
    if (!disabled) {
      handleTriggerMouseEnter();
    }
  };

  const button = (
    <Button
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center !rounded-lg',
        disabled
          ? 'text-muted-foreground cursor-not-allowed opacity-40'
          : isOpen
            ? 'bg-background text-foreground/80'
            : 'bg-transparent text-foreground/80 hover:bg-accent hover:text-highlight',
        className
      )}
      variant="ghost"
      size="icon"
      aria-label={tooltip}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleTriggerMouseLeave}
    >
      <Icons.ByName
        name="tool-layout"
        className="h-7 w-7"
      />
    </Button>
  );

  // If user passed children (custom button), just wrap it directly
  if (children) {
    return (
      <PopoverTrigger
        asChild
        className={className}
      >
        <span
          ref={setTriggerNode}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleTriggerMouseLeave}
        >
          {children}
        </span>
      </PopoverTrigger>
    );
  }

  if (!isOpen && hasTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <span
              ref={setTriggerNode}
              data-cy="layout-button"
            >
              {button}
            </span>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {tooltip && <div>{tooltip}</div>}
          {disabled && disabledText && <div className="text-muted-foreground">{disabledText}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PopoverTrigger asChild>
      <span
        ref={setTriggerNode}
        data-cy="layout-button"
      >
        {button}
      </span>
    </PopoverTrigger>
  );
};

type ContentProps = {
  children: React.ReactNode;
  className?: string;
  align?: 'center' | 'start' | 'end';
  sideOffset?: number;
};

const Content = ({ children, className, align = 'center', sideOffset = 8 }: ContentProps) => {
  const { handleContentMouseEnter, handleContentMouseLeave, setContentNode, setIsOpen } =
    useLayoutSelector();

  return (
    <PopoverContent
      ref={setContentNode}
      align={align}
      sideOffset={sideOffset}
      className={cn('w-auto rounded-lg border-none p-0 shadow-lg', className)}
      onMouseEnter={handleContentMouseEnter}
      onMouseLeave={handleContentMouseLeave}
      onInteractOutside={() => setIsOpen(false)}
      onFocusOutside={() => setIsOpen(false)}
    >
      <div className="flex">{children}</div>
    </PopoverContent>
  );
};

type PresetSectionProps = {
  children: React.ReactNode;
  title: string;
  className?: string;
};

const PresetSection = ({ children, title, className }: PresetSectionProps) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="text-muted-foreground text-xs">{title}</div>
      {React.Children.count(children) > 0 && (
        <div
          className={cn(title.toLowerCase() === 'common' ? 'flex gap-2' : 'flex flex-col gap-0')}
        >
          {children}
        </div>
      )}
    </div>
  );
};

type PresetProps = LayoutPresetType & {
  className?: string;
  isPreset?: boolean;
  iconSize?: string; // Add new prop for icon size
};

const Preset = ({
  title,
  icon,
  commandOptions,
  disabled = false,
  className,
  isPreset = false,
  iconSize, // New prop
}: PresetProps) => {
  const { onSelection, onSelectionPreset } = useLayoutSelector();

  const handleClick = () => {
    if (disabled) {
      return;
    }

    if (isPreset) {
      onSelectionPreset(commandOptions);
    } else {
      onSelection(commandOptions);
    }
  };

  return (
    <div
      className={cn(
        'group cursor-pointer rounded transition',
        'hover:bg-accent flex items-center gap-2 p-1.5',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      data-cy={title}
    >
      <div className="flex-shrink-0">
        <Icons.ByName
          name={icon}
          className={cn('group-hover:text-primary', iconSize)}
        />
      </div>
      {title && <div className="text-foreground text-base">{title}</div>}
    </div>
  );
};

type GridSelectorProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

const GridSelector = ({ rows = 3, columns = 4, className }: GridSelectorProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);
  const { onSelection } = useLayoutSelector();

  const hoverX = hoveredIndex !== undefined ? hoveredIndex % columns : -1;
  const hoverY = hoveredIndex !== undefined ? Math.floor(hoveredIndex / columns) : -1;

  const isHovered = (index: number) => {
    if (hoveredIndex === undefined) {
      return false;
    }
    const x = index % columns;
    const y = Math.floor(index / columns);

    return x <= hoverX && y <= hoverY;
  };

  const handleSelection = (index: number) => {
    const x = index % columns;
    const y = Math.floor(index / columns);
    onSelection({
      numRows: y + 1,
      numCols: x + 1,
    });
  };

  return (
    <div
      className={cn(className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 20px)`,
        gridTemplateRows: `repeat(${rows}, 20px)`,
        gap: '2px',
      }}
    >
      {Array.from(Array(rows * columns).keys()).map(index => (
        <div
          key={index}
          className={cn('cursor-pointer', isHovered(index) ? 'bg-primary-active' : 'bg-muted')}
          data-cy={`Layout-${index % columns}-${Math.floor(index / columns)}`}
          onClick={() => handleSelection(index)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(undefined)}
        />
      ))}
    </div>
  );
};

const Divider = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-border', className)}></div>
);

const HelpText = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-muted-foreground text-xs leading-tight', className)}>{children}</p>
);

// Assemble the compound component
LayoutSelector.Trigger = Trigger;
LayoutSelector.Content = Content;
LayoutSelector.PresetSection = PresetSection;
LayoutSelector.Preset = Preset;
LayoutSelector.GridSelector = GridSelector;
LayoutSelector.Divider = Divider;
LayoutSelector.HelpText = HelpText;

// PropTypes
LayoutSelector.propTypes = {
  onSelectionChange: PropTypes.func,
  onSelection: PropTypes.func,
  onSelectionPreset: PropTypes.func,
  children: PropTypes.node.isRequired,
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  tooltipDisabled: PropTypes.bool,
};

export { LayoutSelector };
export default LayoutSelector;
