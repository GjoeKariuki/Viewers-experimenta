import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

import { InvestigationalUseDialog } from '@ohif/ui-next';
import { HangingProtocolService, CommandsManager } from '@ohif/core';
import { useAppConfig } from '@state';
import ViewerHeader from './ViewerHeader';
import SidePanelWithServices from '../Components/SidePanelWithServices';
import { Onboarding, ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@ohif/ui-next';
import useResizablePanels from './ResizablePanelsHook';
import './ViewerLayout.css';

const resizableHandleClassName = 'mt-[1px] bg-border';
const MOBILE_STUDY_REPORTS_DIALOG_ID = 'mobile-study-reports-dialog';

function ViewerLayout({
  // From Extension Module Params
  extensionManager,
  servicesManager,
  hotkeysManager,
  commandsManager,
  // From Modes
  viewports,
  ViewportGridComp,
  leftPanelClosed = false,
  rightPanelClosed = false,
  leftPanelResizable = false,
  rightPanelResizable = false,
  leftPanelInitialExpandedWidth,
  rightPanelInitialExpandedWidth,
  leftPanelMinimumExpandedWidth,
  rightPanelMinimumExpandedWidth,
}: withAppTypes): React.FunctionComponent {
  const [appConfig] = useAppConfig();

  const { panelService, hangingProtocolService, customizationService, uiDialogService } =
    servicesManager.services;
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(appConfig.showLoadingIndicator);

  const hasPanels = useCallback(
    (side): boolean => !!panelService.getPanels(side).length,
    [panelService]
  );

  const [hasRightPanels, setHasRightPanels] = useState(hasPanels('right'));
  const [hasLeftPanels, setHasLeftPanels] = useState(hasPanels('left'));
  const [leftPanelClosedState, setLeftPanelClosed] = useState(leftPanelClosed);
  const [rightPanelClosedState, setRightPanelClosed] = useState(rightPanelClosed);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const wasMobileRef = useRef(isMobile);
  const mobilePanelsExpandedRef = useRef(false);

  const [
    leftPanelProps,
    rightPanelProps,
    resizablePanelGroupProps,
    resizableLeftPanelProps,
    resizableViewportGridPanelProps,
    resizableRightPanelProps,
    onHandleDragging,
  ] = useResizablePanels(
    leftPanelClosedState,
    setLeftPanelClosed,
    rightPanelClosedState,
    setRightPanelClosed,
    hasLeftPanels,
    hasRightPanels,
    leftPanelInitialExpandedWidth,
    rightPanelInitialExpandedWidth,
    leftPanelMinimumExpandedWidth,
    rightPanelMinimumExpandedWidth
  );

  const handleMouseEnter = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  const scheduleViewportResize = useCallback(() => {
    const { cornerstoneViewportService } = servicesManager.services;

    const resizeAndRender = () => {
      cornerstoneViewportService?.resize?.();
      cornerstoneViewportService?.getRenderingEngineIfExists?.()?.render?.();
    };

    resizeAndRender();
    window.requestAnimationFrame?.(resizeAndRender);
    window.setTimeout(resizeAndRender, 120);
    window.setTimeout(resizeAndRender, 360);
  }, [servicesManager.services]);

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  /**
   * Set body classes (tailwindcss) that don't allow vertical
   * or horizontal overflow (no scrolling). Also guarantee window
   * is sized to our viewport.
   */
  useEffect(() => {
    document.body.classList.add('bg-background');

    if (typeof window === 'undefined') {
      document.body.classList.add('overflow-hidden');

      return () => {
        document.body.classList.remove('bg-background');
        document.body.classList.remove('overflow-hidden');
      };
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncBodyOverflow = () => {
      document.body.classList.toggle('overflow-hidden', !mediaQuery.matches);
    };

    syncBodyOverflow();
    mediaQuery.addEventListener?.('change', syncBodyOverflow);

    return () => {
      mediaQuery.removeEventListener?.('change', syncBodyOverflow);
      document.body.classList.remove('bg-background');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncIsMobile = () => {
      const nextIsMobile = mediaQuery.matches;
      const wasMobile = wasMobileRef.current;

      if (wasMobile && !nextIsMobile) {
        uiDialogService?.hide?.(MOBILE_STUDY_REPORTS_DIALOG_ID);
      }

      if (nextIsMobile && hasPanels('right')) {
        setRightPanelClosed(true);
      }

      wasMobileRef.current = nextIsMobile;
      setIsMobile(nextIsMobile);
    };

    syncIsMobile();
    mediaQuery.addEventListener?.('change', syncIsMobile);

    return () => {
      mediaQuery.removeEventListener?.('change', syncIsMobile);
    };
  }, [hasPanels, uiDialogService]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const expandMobilePanels = () => {
      if (!isMobile) {
        mobilePanelsExpandedRef.current = false;
        scheduleViewportResize();
        return;
      }

      if (hasRightPanels) {
        setRightPanelClosed(true);
      }

      if (!mobilePanelsExpandedRef.current) {
        if (hasLeftPanels) {
          setLeftPanelClosed(false);
        }

        mobilePanelsExpandedRef.current = true;
      }

      scheduleViewportResize();
    };

    expandMobilePanels();
  }, [hasLeftPanels, hasRightPanels, isMobile, scheduleViewportResize]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleMobileResize = () => {
      if (mediaQuery.matches) {
        scheduleViewportResize();
      }
    };

    window.addEventListener('resize', handleMobileResize);
    window.addEventListener('orientationchange', handleMobileResize);
    window.visualViewport?.addEventListener('resize', handleMobileResize);
    window.visualViewport?.addEventListener('scroll', handleMobileResize);

    return () => {
      window.removeEventListener('resize', handleMobileResize);
      window.removeEventListener('orientationchange', handleMobileResize);
      window.visualViewport?.removeEventListener('resize', handleMobileResize);
      window.visualViewport?.removeEventListener('scroll', handleMobileResize);
    };
  }, [scheduleViewportResize]);

  const getComponent = id => {
    const entry = extensionManager.getModuleEntry(id);

    if (!entry?.component) {
      throw new Error(
        `${id} is not valid for an extension module or no component found from extension ${id}. Please verify your configuration or ensure that the extension is properly registered. It's also possible that your mode is utilizing a module from an extension that hasn't been included in its dependencies (add the extension to the "extensionDependencies" array in your mode's index.js file). Check the reference string to the extension in your Mode configuration`
      );
    }

    return { entry };
  };

  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      HangingProtocolService.EVENTS.PROTOCOL_CHANGED,

      // Todo: right now to set the loading indicator to false, we need to wait for the
      // hangingProtocolService to finish applying the viewport matching to each viewport,
      // however, this might not be the only approach to set the loading indicator to false. we need to explore this further.
      () => {
        setShowLoadingIndicator(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [hangingProtocolService]);

  const getViewportComponentData = viewportComponent => {
    const { entry } = getComponent(viewportComponent.namespace);

    return {
      component: entry.component,
      isReferenceViewable: entry.isReferenceViewable,
      displaySetsToDisplay: viewportComponent.displaySetsToDisplay,
    };
  };

  useEffect(() => {
    const { unsubscribe } = panelService.subscribe(
      panelService.EVENTS.PANELS_CHANGED,
      ({ options }) => {
        const nextHasLeftPanels = hasPanels('left');
        const nextHasRightPanels = hasPanels('right');

        setHasLeftPanels(nextHasLeftPanels);
        setHasRightPanels(nextHasRightPanels);

        if (options && options.leftPanelClosed !== undefined) {
          setLeftPanelClosed(options.leftPanelClosed);
        }

        if (isMobile && nextHasRightPanels) {
          setRightPanelClosed(true);
          return;
        }

        if (options && options.rightPanelClosed !== undefined) {
          setRightPanelClosed(options.rightPanelClosed);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [panelService, hasPanels, isMobile]);

  const viewportComponents = viewports.map(getViewportComponentData);

  return (
    <div className="viewer-layout">
      <ViewerHeader
        hotkeysManager={hotkeysManager}
        extensionManager={extensionManager}
        servicesManager={servicesManager}
        appConfig={appConfig}
      />
      <div
        className="viewer-layout__body bg-background relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden"
        style={{ height: 'calc(100vh - 52px)' }}
      >
        <React.Fragment>
          {showLoadingIndicator && (
            <LoadingIndicatorProgress className="bg-background h-full w-full" />
          )}
          <ResizablePanelGroup
            {...resizablePanelGroupProps}
            className="viewer-layout__panel-group"
          >
            {/* LEFT SIDEPANELS */}
            {hasLeftPanels ? (
              <>
                <ResizablePanel
                  {...resizableLeftPanelProps}
                  className="viewer-layout__side-panel-shell viewer-layout__left-panel-shell"
                >
                  <SidePanelWithServices
                    side="left"
                    className="viewer-layout__side-panel viewer-layout__left-panel"
                    isExpanded={!leftPanelClosedState}
                    servicesManager={servicesManager}
                    {...leftPanelProps}
                  />
                </ResizablePanel>
                <ResizableHandle
                  onDragging={onHandleDragging}
                  disabled={!leftPanelResizable}
                  className={`${resizableHandleClassName} viewer-layout__resize-handle`}
                />
              </>
            ) : null}
            {/* TOOLBAR + GRID */}
            <ResizablePanel
              {...resizableViewportGridPanelProps}
              className="viewer-layout__viewport-panel"
            >
              <div className="flex h-full flex-1 flex-col">
                <div
                  className="viewer-layout__viewport-wrapper bg-background relative flex h-full flex-1 items-center justify-center overflow-hidden"
                  onMouseEnter={handleMouseEnter}
                >
                  <ViewportGridComp
                    servicesManager={servicesManager}
                    viewportComponents={viewportComponents}
                    commandsManager={commandsManager}
                  />
                </div>
              </div>
            </ResizablePanel>
            {hasRightPanels && !isMobile ? (
              <>
                <ResizableHandle
                  onDragging={onHandleDragging}
                  disabled={!rightPanelResizable}
                  className={`${resizableHandleClassName} viewer-layout__resize-handle`}
                />
                <ResizablePanel
                  {...resizableRightPanelProps}
                  className={`viewer-layout__side-panel-shell viewer-layout__right-panel-shell ${
                    rightPanelClosedState ? '' : 'viewer-layout__right-panel-shell--expanded'
                  }`}
                >
                  <SidePanelWithServices
                    side="right"
                    className="viewer-layout__side-panel viewer-layout__right-panel"
                    isExpanded={!rightPanelClosedState}
                    servicesManager={servicesManager}
                    {...rightPanelProps}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </React.Fragment>
      </div>
      <Onboarding tours={customizationService.getCustomization('ohif.tours')} />
      <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} />
    </div>
  );
}

ViewerLayout.propTypes = {
  // From extension module params
  extensionManager: PropTypes.shape({
    getModuleEntry: PropTypes.func.isRequired,
  }).isRequired,
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object.isRequired,
  // From modes
  leftPanels: PropTypes.array,
  rightPanels: PropTypes.array,
  leftPanelClosed: PropTypes.bool.isRequired,
  rightPanelClosed: PropTypes.bool.isRequired,
  /** Responsible for rendering our grid of viewports; provided by consuming application */
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  viewports: PropTypes.array,
};

export default ViewerLayout;
