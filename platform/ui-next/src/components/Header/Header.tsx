import React, { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  ToolButton,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  Branding?: ReactNode;
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
}

function Header({
  children,
  menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  Branding,
  PatientInfo,
  UndoRedo,
  Secondary,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  const hasReturnButton = isReturnEnabled && onClickReturnButton;
  const brandingComponent = Branding ?? WhiteLabeling?.createLogoComponentFn?.(React, props);
  const hasBranding = Boolean(brandingComponent);
  const hasUndoRedo = Boolean(UndoRedo);
  const hasPatientInfo = Boolean(PatientInfo);
  const hasSecondary = Boolean(Secondary);

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        <div className="relative min-h-[88px] md:h-[48px] md:min-h-0">
          <div className="flex h-10 items-center justify-between md:contents">
            {(hasReturnButton || hasBranding || hasSecondary) && (
              <div className="flex items-center md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">
                {hasReturnButton && (
                  <button
                    type="button"
                    className="text-foreground hover:bg-primary/25 ml-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded"
                    onClick={onClickReturn}
                    data-cy="return-to-work-list"
                  >
                    <Icons.ArrowLeft className="h-7 w-7" />
                  </button>
                )}
                {hasBranding && (
                  <div className={`${hasReturnButton ? 'ml-2' : 'ml-1'} flex h-8 items-center`}>
                    {brandingComponent}
                  </div>
                )}
                {hasSecondary && (
                  <div
                    className={`${hasReturnButton || hasBranding ? 'ml-2' : 'ml-1'} flex h-8 items-center`}
                  >
                    {Secondary}
                  </div>
                )}
              </div>
            )}
            <div className="flex select-none items-center md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
              {UndoRedo}
              {hasUndoRedo && hasPatientInfo && (
                <div className="border-border mx-1.5 h-[25px] border-r"></div>
              )}
              {PatientInfo}
              {hasPatientInfo && <div className="border-border mx-1.5 h-[25px] border-r"></div>}
              <div className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-foreground hover:bg-primary/25 h-8 w-8"
                    >
                      <Icons.GearSettings />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {menuOptions.map((option, index) => {
                      const IconComponent = option.icon
                        ? Icons[option.icon as keyof typeof Icons]
                        : null;
                      return (
                        <DropdownMenuItem
                          key={index}
                          onSelect={option.onClick}
                          className="flex items-center gap-2 py-2"
                        >
                          {IconComponent && (
                            <span className="flex h-4 w-4 items-center justify-center">
                              <Icons.ByName name={option.icon} />
                            </span>
                          )}
                          <span className="flex-1">{option.title}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto pb-1 md:absolute md:left-1/2 md:top-1/2 md:w-auto md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-visible md:pb-0">
            <div className="flex min-w-max items-center justify-start gap-1 px-1 md:justify-center md:gap-2 md:px-0">
              {children}
            </div>
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;
