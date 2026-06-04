import React from 'react';
import { Button } from '../Button';
import { Icons } from '../Icons';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../Tooltip';

/**
 * ToolButtonList Component
 * Root component that wraps the default and dropdown sections
 * -----------------------------------------------
 */
interface ToolButtonListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const ToolButtonList = React.forwardRef<HTMLDivElement, ToolButtonListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ToolButtonList.displayName = 'ToolButtonList';

/**
 * ToolButtonListDefault Component
 * Container for the default/primary tool button
 * -----------------------------------------------
 */
interface ToolButtonListDefaultProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  tooltip?: string;
  disabledText?: string;
  disabled?: boolean;
}

const ToolButtonListDefault = React.forwardRef<HTMLDivElement, ToolButtonListDefaultProps>(
  ({ className, children, tooltip, disabledText, disabled, ...props }, ref) => {
    const hasTooltip = tooltip || disabledText;

    const defaultContent = (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {children}
      </div>
    );

    if (!hasTooltip) {
      return defaultContent;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{defaultContent}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {tooltip && <div>{tooltip}</div>}
          {disabledText && disabled && <div className="text-muted-foreground">{disabledText}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }
);
ToolButtonListDefault.displayName = 'ToolButtonListDefault';

/**
 * ToolButtonListDropDown Component
 * Container for the dropdown section with trigger and content
 * -----------------------------------------------
 */
interface ToolButtonListDropDownProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const ToolButtonListDropDown = React.forwardRef<HTMLDivElement, ToolButtonListDropDownProps>(
  ({ children, className, disabled = false, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearCloseTimeout = React.useCallback(() => {
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    }, []);

    const scheduleClose = React.useCallback(() => {
      clearCloseTimeout();
      closeTimeoutRef.current = setTimeout(() => {
        setOpen(false);
        closeTimeoutRef.current = null;
      }, 120);
    }, [clearCloseTimeout]);

    const isWithinDropdown = React.useCallback((target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return false;
      }

      return (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target) ||
        false
      );
    }, []);

    const setContentNode = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;

        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    React.useEffect(() => {
      return () => {
        clearCloseTimeout();
      };
    }, [clearCloseTimeout]);

    React.useEffect(() => {
      if (disabled && open) {
        clearCloseTimeout();
        setOpen(false);
      }
    }, [disabled, open, clearCloseTimeout]);

    React.useEffect(() => {
      if (!open) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => {
        if (isWithinDropdown(event.target)) {
          clearCloseTimeout();
          return;
        }

        scheduleClose();
      };

      const handleWindowBlur = () => {
        clearCloseTimeout();
        setOpen(false);
      };

      document.addEventListener('pointermove', handlePointerMove, true);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove, true);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }, [open, clearCloseTimeout, isWithinDropdown, scheduleClose]);

    const triggerButton = (
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(
          'text-foreground/80 hover:bg-background hover:text-highlight border-primary',
          'inline-flex h-10 w-7 items-center justify-center',
          '!rounded-tr-lg !rounded-br-lg !rounded-tl-none !rounded-bl-none',
          'bg-transparent disabled:cursor-not-allowed',
          className
        )}
        onPointerEnter={() => {
          if (disabled) {
            return;
          }

          clearCloseTimeout();
          if (!open) {
            setOpen(true);
          }
        }}
        onPointerLeave={event => {
          if (disabled) {
            return;
          }

          if (isWithinDropdown(event.relatedTarget)) {
            clearCloseTimeout();
            return;
          }

          scheduleClose();
        }}
        onMouseLeave={event => {
          if (disabled) {
            return;
          }

          if (isWithinDropdown(event.relatedTarget)) {
            clearCloseTimeout();
            return;
          }

          scheduleClose();
        }}
      >
        <Icons.ByName
          name="chevron-down"
          className="text-primary h-5 w-5"
        />
      </Button>
    );

    if (disabled) {
      return triggerButton;
    }

    return (
      <Popover
        modal={false}
        open={open}
        onOpenChange={nextOpen => {
          clearCloseTimeout();
          setOpen(nextOpen);
        }}
        {...props}
      >
        <PopoverTrigger asChild>
          {triggerButton}
        </PopoverTrigger>
        <PopoverContent
          ref={setContentNode}
          side="bottom"
          align="start"
          sideOffset={2}
          className="border-input/50 w-auto min-w-[8rem] overflow-hidden rounded border p-1 shadow-md"
          onOpenAutoFocus={event => event.preventDefault()}
          onInteractOutside={() => {
            clearCloseTimeout();
            setOpen(false);
          }}
          onFocusOutside={() => {
            clearCloseTimeout();
            setOpen(false);
          }}
          onPointerEnter={clearCloseTimeout}
          onPointerLeave={event => {
            if (isWithinDropdown(event.relatedTarget)) {
              clearCloseTimeout();
              return;
            }

            scheduleClose();
          }}
          onMouseLeave={event => {
            if (isWithinDropdown(event.relatedTarget)) {
              clearCloseTimeout();
              return;
            }

            scheduleClose();
          }}
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  }
);
ToolButtonListDropDown.displayName = 'ToolButtonListDropDown';

/**
 * ToolButtonListItem Component
 * Individual item in the dropdown menu
 * -----------------------------------------------
 */
interface ToolButtonListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  children?: React.ReactNode;
  className?: string;
  disabledText?: string;
  tooltip?: string;
  onSelect?: () => void;
  commands?: unknown;
  evaluate?: unknown;
  evaluateProps?: unknown;
  hideWhenDisabled?: boolean;
  isActive?: boolean;
  label?: string;
  listeners?: unknown;
  options?: unknown;
  visible?: boolean;
}

const ToolButtonListItem = React.forwardRef<
  HTMLButtonElement,
  ToolButtonListItemProps
>(
  (
    {
      className,
      children,
      icon,
      disabledText,
      tooltip,
      disabled,
      onSelect,
      onClick,
      commands,
      evaluate,
      evaluateProps,
      hideWhenDisabled,
      isActive,
      label,
      listeners,
      options,
      visible,
      ...props
    },
    ref
  ) => {
    void commands;
    void evaluate;
    void evaluateProps;
    void hideWhenDisabled;
    void isActive;
    void label;
    void listeners;
    void options;
    void visible;

    const defaultTooltip = tooltip || (typeof children === 'string' ? children : undefined);

    const menuItem = (
      <button
        type="button"
        ref={ref}
        disabled={disabled}
        onClick={event => {
          onClick?.(event);

          if (!event.defaultPrevented) {
            onSelect?.();
          }
        }}
        onKeyDown={event => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault();
            onSelect?.();
          }
        }}
        aria-disabled={disabled}
        className={cn(
          'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded px-1 py-1 text-base outline-none transition-colors disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      >
        {icon && (
          <Icons.ByName
            name={icon || 'MissingIcon'}
            className="h-6 w-6"
          />
        )}
        {children}
      </button>
    );

    // Todo: there is a weird issue where i can't control the duration of the delay
    // for the items in this list, causing the tooltip to show up too early in the
    // dropdown menu. So i'm just removing the tooltip for list items unless the disabledText is set.
    if (!disabled) {
      return menuItem;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{menuItem}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {defaultTooltip && <div>{defaultTooltip}</div>}
          {disabledText && disabled && <div className="text-muted-foreground">{disabledText}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }
);
ToolButtonListItem.displayName = 'ToolButtonListItem';

/**
 * ToolButtonListDivider Component
 * Divider between items in the dropdown menu
 * -----------------------------------------------
 */
const ToolButtonListDivider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('bg-primary h-5 w-px self-center', className)}
    {...props}
  />
));
ToolButtonListDivider.displayName = 'ToolButtonListDivider';

export {
  ToolButtonList,
  ToolButtonListDefault,
  ToolButtonListDropDown,
  ToolButtonListItem,
  ToolButtonListDivider,
};
