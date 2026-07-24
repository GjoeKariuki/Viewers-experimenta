import React, { useEffect, useCallback, useRef } from 'react';
import { Types } from '@ohif/core';
import { ViewportGrid, ViewportPane } from '@ohif/ui-next';
import { useViewportGrid } from '@ohif/ui-next';
import EmptyViewport from './EmptyViewport';
import { useAppConfig } from '@state';

const DEFAULT_PROTOCOL_ID = 'default';
const SERIES_CHANGE_RESET_WAIT_FRAMES = 5;
const RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES = ['volume', 'volume3d'];

function buildFallbackViewportUpdate(viewportId, displaySetInstanceUID) {
  if (!viewportId) {
    return [];
  }

  return [
    {
      viewportId,
      displaySetInstanceUIDs: [displaySetInstanceUID],
    },
  ];
}

function isReconstructibleViewport(viewport) {
  return RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES.includes(viewport?.viewportOptions?.viewportType);
}

function normalizeViewportUpdates(
  viewportsToUpdate,
  viewportGridService,
  fallbackViewportId,
  displaySetInstanceUID
) {
  const { viewports } = viewportGridService.getState();

  if (
    Array.isArray(viewportsToUpdate) &&
    viewportsToUpdate.length > 0 &&
    viewportsToUpdate.every(viewport => viewport?.viewportId && viewports?.has(viewport.viewportId))
  ) {
    return viewportsToUpdate;
  }

  return buildFallbackViewportUpdate(fallbackViewportId, displaySetInstanceUID);
}

function getProtocolViewportIds(hangingProtocolService, protocolId = DEFAULT_PROTOCOL_ID) {
  try {
    const protocol = hangingProtocolService.getProtocolById(protocolId);
    const stage = protocol?.stages?.[0];

    return (stage?.viewports || [])
      .map(viewport => viewport?.viewportOptions?.viewportId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function protocolUsesReconstructibleViewports(hangingProtocolService, protocolId) {
  if (!protocolId || protocolId === DEFAULT_PROTOCOL_ID) {
    return false;
  }

  try {
    const protocol = hangingProtocolService.getProtocolById(protocolId);
    const viewportOptions = [
      protocol?.defaultViewport?.viewportOptions,
      ...(protocol?.stages || []).flatMap(stage =>
        (stage?.viewports || []).map(viewport => viewport?.viewportOptions)
      ),
    ];

    return viewportOptions.some(viewportOptions =>
      RESET_ON_SERIES_CHANGE_VIEWPORT_TYPES.includes(viewportOptions?.viewportType)
    );
  } catch {
    return false;
  }
}

function getSafeViewportId(viewportGridService, preferredViewportId) {
  const { activeViewportId, viewports } = viewportGridService.getState();

  if (preferredViewportId && viewports?.has(preferredViewportId)) {
    return preferredViewportId;
  }

  if (activeViewportId && viewports?.has(activeViewportId)) {
    return activeViewportId;
  }

  return viewports?.keys?.().next?.().value;
}

function getViewportIdAfterReset(viewportGridService, targetViewportIds = []) {
  const { activeViewportId, viewports } = viewportGridService.getState();
  const viewportIds = Array.from(viewports?.keys?.() ?? []);

  if (!viewportIds.length) {
    return undefined;
  }

  const candidateViewportIds = (targetViewportIds.length ? targetViewportIds : viewportIds).filter(
    viewportId => {
      const viewport = viewports?.get(viewportId);

      return viewport && !isReconstructibleViewport(viewport);
    }
  );

  if (activeViewportId && candidateViewportIds.includes(activeViewportId)) {
    return activeViewportId;
  }

  if (candidateViewportIds.length) {
    return candidateViewportIds[0];
  }

  return viewportIds.find(viewportId => !isReconstructibleViewport(viewports?.get(viewportId)));
}

function waitForNextFrame() {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      resolve(undefined);
      return;
    }

    window.requestAnimationFrame(() => resolve(undefined));
  });
}

async function waitForViewportIdAfterReset(
  viewportGridService,
  hangingProtocolService,
  targetProtocolId = DEFAULT_PROTOCOL_ID
) {
  const targetViewportIds = getProtocolViewportIds(hangingProtocolService, targetProtocolId);

  for (let i = 0; i < SERIES_CHANGE_RESET_WAIT_FRAMES; i++) {
    const viewportId = getViewportIdAfterReset(viewportGridService, targetViewportIds);

    if (viewportId) {
      return viewportId;
    }

    await waitForNextFrame();
  }

  return getViewportIdAfterReset(viewportGridService, targetViewportIds);
}

function ViewerViewportGrid(props: withAppTypes) {
  const { servicesManager, viewportComponents = [], dataSource, commandsManager } = props;
  const [viewportGrid, viewportGridService] = useViewportGrid();
  const [appConfig] = useAppConfig();

  const { layout, activeViewportId, viewports, isHangingProtocolLayout } = viewportGrid;
  const { numCols, numRows } = layout;
  const layoutHash = useRef(null);

  const { displaySetService, hangingProtocolService, uiNotificationService, customizationService } =
    servicesManager.services;

  const generateLayoutHash = () => `${numCols}-${numRows}`;

  /**
   * This callback runs after the viewports structure has changed in any way.
   * On initial display, that means if it has changed by applying a HangingProtocol,
   * while subsequently it may mean by changing the stage or by manually adjusting
   * the layout.

   */
  const updateDisplaySetsFromProtocol = (
    _protocol: Types.HangingProtocol.Protocol,
    stage,
    _activeStudyUID,
    viewportMatchDetails
  ) => {
    const availableDisplaySets = displaySetService.getActiveDisplaySets();

    if (!availableDisplaySets.length) {
      console.log('No available display sets', availableDisplaySets);
      return;
    }

    // Match each viewport individually
    const { layoutType } = stage.viewportStructure;
    const stageProps = stage.viewportStructure.properties;
    const { columns: numCols, rows: numRows, layoutOptions = [] } = stageProps;

    /**
     * This find or create viewport uses the hanging protocol results to
     * specify the viewport match details, which specifies the size and
     * setup of the various viewports.
     */
    const findOrCreateViewport = pos => {
      const viewportId = Array.from(viewportMatchDetails.keys())[pos];
      const details = viewportMatchDetails.get(viewportId);
      if (!details) {
        console.log('No match details for viewport', viewportId);
        return;
      }

      const { displaySetsInfo, viewportOptions } = details;
      const displaySetUIDsToHang = [];
      const displaySetUIDsToHangOptions = [];

      displaySetsInfo.forEach(({ displaySetInstanceUID, displaySetOptions }) => {
        if (displaySetInstanceUID) {
          displaySetUIDsToHang.push(displaySetInstanceUID);
        }

        displaySetUIDsToHangOptions.push(displaySetOptions);
      });

      const computedViewportOptions = hangingProtocolService.getComputedOptions(
        viewportOptions,
        displaySetUIDsToHang
      );

      const computedDisplaySetOptions = hangingProtocolService.getComputedOptions(
        displaySetUIDsToHangOptions,
        displaySetUIDsToHang
      );

      return {
        displaySetInstanceUIDs: displaySetUIDsToHang,
        displaySetOptions: computedDisplaySetOptions,
        viewportOptions: computedViewportOptions,
      };
    };

    viewportGridService.setLayout({
      numRows,
      numCols,
      layoutType,
      layoutOptions,
      findOrCreateViewport,
      isHangingProtocolLayout: true,
    });
  };

  const _getUpdatedViewports = useCallback(
    async (viewportId, displaySetInstanceUID) => {
      if (!displaySetInstanceUID) {
        return [];
      }

      const protocolId = hangingProtocolService.getState()?.protocolId;
      let viewportIdToUse = getSafeViewportId(viewportGridService, viewportId);
      const currentViewportDisplaySetInstanceUID = viewportGridService
        .getState()
        .viewports?.get(viewportIdToUse)?.displaySetInstanceUIDs?.[0];

      const getRequiredViewports = () =>
        hangingProtocolService.getViewportsRequireUpdate(
          viewportIdToUse,
          displaySetInstanceUID,
          viewportGridService.getState().isHangingProtocolLayout
        );

      const resetToDefaultProtocol = () => {
        const studyInstanceUID =
          displaySetService.getDisplaySetByUID(displaySetInstanceUID)?.StudyInstanceUID;

        return commandsManager.run('setHangingProtocol', {
          protocolId: DEFAULT_PROTOCOL_ID,
          StudyInstanceUID: studyInstanceUID,
          reset: true,
        });
      };

      if (
        protocolUsesReconstructibleViewports(hangingProtocolService, protocolId) &&
        currentViewportDisplaySetInstanceUID !== displaySetInstanceUID
      ) {
        const didReset = resetToDefaultProtocol();

        if (didReset !== false) {
          viewportIdToUse = await waitForViewportIdAfterReset(
            viewportGridService,
            hangingProtocolService
          );
        }
      }

      try {
        return normalizeViewportUpdates(
          getRequiredViewports(),
          viewportGridService,
          viewportIdToUse,
          displaySetInstanceUID
        );
      } catch (error) {
        console.warn(error);

        const didReset = resetToDefaultProtocol();

        if (didReset !== false) {
          viewportIdToUse = await waitForViewportIdAfterReset(
            viewportGridService,
            hangingProtocolService
          );

          try {
            return normalizeViewportUpdates(
              getRequiredViewports(),
              viewportGridService,
              viewportIdToUse,
              displaySetInstanceUID
            );
          } catch (retryError) {
            console.warn(retryError);
          }
        }

        const fallbackViewports = buildFallbackViewportUpdate(
          viewportIdToUse,
          displaySetInstanceUID
        );

        if (!fallbackViewports.length) {
          uiNotificationService.show({
            title: 'Drag and Drop',
            message: 'The selected series could not be added to the viewport.',
            type: 'error',
            duration: 3000,
          });
        }

        return fallbackViewports;
      }
    },
    [
      commandsManager,
      displaySetService,
      hangingProtocolService,
      uiNotificationService,
      viewportGridService,
    ]
  );

  // Using Hanging protocol engine to match the displaySets
  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      hangingProtocolService.EVENTS.PROTOCOL_CHANGED,
      ({ protocol, stage, activeStudyUID, viewportMatchDetails }) => {
        updateDisplaySetsFromProtocol(protocol, stage, activeStudyUID, viewportMatchDetails);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Check viewport readiness in useEffect
  useEffect(() => {
    const allReady = viewportGridService.getGridViewportsReady();
    const sameLayoutHash = layoutHash.current === generateLayoutHash();
    if (allReady && !sameLayoutHash) {
      layoutHash.current = generateLayoutHash();
      viewportGridService.publishViewportsReady();
    }
  }, [viewportGridService, generateLayoutHash]);

  const onDropHandler = (viewportId, { displaySetInstanceUID }) => {
    const { viewportGridService } = servicesManager.services;
    const customOnDropHandler = customizationService.getCustomization('customOnDropHandler');
    const dropHandlerPromise = customOnDropHandler({
      ...props,
      viewportId,
      displaySetInstanceUID,
      appConfig,
    });
    dropHandlerPromise.then(async ({ handled }) => {
      if (!handled) {
        const updatedViewports = await _getUpdatedViewports(viewportId, displaySetInstanceUID);

        commandsManager.run('setDisplaySetsForViewports', { viewportsToUpdate: updatedViewports });
      }
    });
    viewportGridService.publishViewportOnDropHandled({ displaySetInstanceUID });
  };

  const getViewportPanes = useCallback(() => {
    const viewportPanes = [];

    const numViewportPanes = viewportGridService.getNumViewportPanes();
    for (let i = 0; i < numViewportPanes; i++) {
      const paneMetadata = Array.from(viewports.values())[i] || {};
      const {
        displaySetInstanceUIDs,
        viewportOptions,
        displaySetOptions, // array of options for each display set in the viewport
        x: viewportX,
        y: viewportY,
        width: viewportWidth,
        height: viewportHeight,
        viewportLabel,
      } = paneMetadata;

      const viewportId = viewportOptions.viewportId;
      const isActive = activeViewportId === viewportId;

      const displaySetInstanceUIDsToUse = displaySetInstanceUIDs || [];

      // This is causing the viewport components re-render when the activeViewportId changes
      const displaySets = displaySetInstanceUIDsToUse
        .map(displaySetInstanceUID => {
          return displaySetService.getDisplaySetByUID(displaySetInstanceUID) || {};
        })
        .filter(displaySet => {
          return !displaySet?.unsupported;
        });

      const { component: ViewportComponent } = _getViewportComponent(
        displaySets,
        viewportComponents,
        uiNotificationService
      );

      // look inside displaySets to see if they need reRendering
      const displaySetsNeedsRerendering = displaySets.some(displaySet => {
        return displaySet.needsRerendering;
      });

      const onInteractionHandler = event => {
        if (isActive) {
          return;
        }

        if (event && (appConfig?.activateViewportBeforeInteraction ?? true)) {
          event.preventDefault();
          event.stopPropagation();
        }

        viewportGridService.setActiveViewportId(viewportId);
      };

      const getBorderStyle = viewportIndex => {
        const style = {} as any;
        const layoutOptions = viewportGridService.getLayoutOptionsFromState(
          viewportGridService.getState()
        );
        const vp = layoutOptions[viewportIndex];
        if (!vp) {
          return style;
        }
        const { x, y, width, height } = vp;
        const tolerance = 0.01;

        if (x + width < 1 - tolerance) {
          style.borderRight = '1px solid hsl(var(--input))';
        }

        if (y + height < 1 - tolerance) {
          style.borderBottom = '1px solid hsl(var(--input))';
        }

        return style;
      };

      viewportPanes[i] = (
        <ViewportPane
          // Note: It is highly important that the key is the viewportId here,
          // since it is used to determine if the component should be re-rendered
          // by React, and also in the hanging protocol and stage changes if the
          // same viewportId is used, React, by default, will only move (not re-render)
          // those components. For instance, if we have a 2x3 layout, and we move
          // from 2x3 to 1x1 (second viewport), if the key is the viewportIndex,
          // React will RE-RENDER the resulting viewport as the key will be different.
          // however, if the key is the viewportId, React will only move the component
          // and not re-render it.
          key={viewportId}
          acceptDropsFor="displayset"
          onDrop={onDropHandler.bind(null, viewportId)}
          onInteraction={onInteractionHandler}
          customStyle={{
            position: 'absolute',
            top: viewportY * 100 + '%',
            left: viewportX * 100 + '%',
            width: viewportWidth * 100 + '%',
            height: viewportHeight * 100 + '%',
            ...getBorderStyle(i),
          }}
          isActive={isActive}
        >
          <div
            data-cy="viewport-pane"
            data-is-active={isActive}
            className="flex h-full w-full min-w-[5px] flex-col"
          >
            <ViewportComponent
              displaySets={displaySets}
              viewportLabel={viewports.size > 1 ? viewportLabel : ''}
              viewportId={viewportId}
              dataSource={dataSource}
              viewportOptions={viewportOptions}
              displaySetOptions={displaySetOptions}
              needsRerendering={displaySetsNeedsRerendering}
              isHangingProtocolLayout={isHangingProtocolLayout}
              onElementEnabled={evt => {
                viewportGridService.setViewportIsReady(viewportId, true);
              }}
            />
          </div>
        </ViewportPane>
      );
    }

    return viewportPanes;
  }, [viewports, activeViewportId, viewportComponents, dataSource]);

  /**
   * Loading indicator until numCols and numRows are gotten from the HangingProtocolService
   */
  if (!numRows || !numCols) {
    return null;
  }

  return (
    <div className="border-input h-full w-full border">
      <ViewportGrid
        numRows={numRows}
        numCols={numCols}
      >
        {getViewportPanes()}
      </ViewportGrid>
    </div>
  );
}

function _getViewportComponent(displaySets, viewportComponents, uiNotificationService) {
  if (!displaySets || !displaySets.length) {
    return { component: EmptyViewport, isReferenceViewable: () => false };
  }

  // Todo: Do we have a viewport that has two different SOPClassHandlerIds?
  const SOPClassHandlerId = displaySets[0].SOPClassHandlerId;

  for (let i = 0; i < viewportComponents.length; i++) {
    if (!viewportComponents[i]) {
      throw new Error('viewport components not defined');
    }
    if (!viewportComponents[i].displaySetsToDisplay) {
      throw new Error('displaySetsToDisplay is null');
    }
    if (viewportComponents[i].displaySetsToDisplay.includes(SOPClassHandlerId)) {
      const { component } = viewportComponents[i];
      return { component };
    }
  }

  console.log("Can't show displaySet", SOPClassHandlerId, displaySets[0]);
  uiNotificationService.show({
    title: 'Viewport Not Supported Yet',
    message: `Cannot display SOPClassUID of ${displaySets[0].SOPClassUID} yet`,
    type: 'error',
  });

  return { component: EmptyViewport };
}

export default ViewerViewportGrid;
