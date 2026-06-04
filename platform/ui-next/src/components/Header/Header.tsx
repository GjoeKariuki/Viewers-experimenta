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
        <div className="relative h-[48px] items-center">
          {(hasReturnButton || hasBranding || hasSecondary) && (
            <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center">
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="flex items-center justify-center space-x-2">{children}</div>
          </div>
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 select-none items-center">
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
                    className="text-foreground hover:bg-primary/25 mt-2 h-full w-full"
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
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;
