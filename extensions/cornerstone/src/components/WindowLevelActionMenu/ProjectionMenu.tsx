import React, { useEffect, useMemo, useState } from 'react';
import { useSystem } from '@ohif/core';
import {
  Button,
  Numeric,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import { useViewportDisplaySets } from '../../hooks/useViewportDisplaySets';
import { useViewportRendering } from '../../hooks/useViewportRendering';
import SelectItemWithModality from '../SelectItemWithModality';
import { PROJECTION_MODES, ProjectionMode } from '../../utils/projectionUtils';

interface ProjectionMenuProps {
  viewportId: string;
  className?: string;
  variant?: 'card' | 'toolbar';
}

const PROJECTION_MODE_ORDER: ProjectionMode[] = [
  PROJECTION_MODES.MINIP,
  PROJECTION_MODES.MIP,
  PROJECTION_MODES.AVG,
  PROJECTION_MODES.COMPOSITE,
];

export function useShouldHideProjectionControls(viewportId?: string): boolean {
  const { servicesManager } = useSystem();
  const { cornerstoneViewportService, hangingProtocolService, viewportGridService } =
    servicesManager.services;
  const [, refreshProjectionControlVisibility] = useState(0);

  useEffect(() => {
    const refresh = () => {
      refreshProjectionControlVisibility(value => value + 1);
    };

    refresh();

    const protocolChangedSubscription = hangingProtocolService.subscribe?.(
      hangingProtocolService.EVENTS.PROTOCOL_CHANGED,
      refresh
    );
    const protocolRestoredSubscription = hangingProtocolService.subscribe?.(
      hangingProtocolService.EVENTS.PROTOCOL_RESTORED,
      refresh
    );
    const viewportGridSubscription = viewportGridService.subscribe?.(
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
      refresh
    );
    const viewportDataSubscription = cornerstoneViewportService.subscribe?.(
      cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
      event => {
        if (!viewportId || event?.viewportId === viewportId) {
          refresh();
        }
      }
    );

    return () => {
      protocolChangedSubscription?.unsubscribe();
      protocolRestoredSubscription?.unsubscribe();
      viewportGridSubscription?.unsubscribe();
      viewportDataSubscription?.unsubscribe();
    };
  }, [cornerstoneViewportService, hangingProtocolService, viewportGridService, viewportId]);

  const viewportOptions = viewportId
    ? cornerstoneViewportService.getViewportInfo(viewportId)?.getViewportOptions?.()
    : undefined;

  return Boolean(viewportOptions?.customViewportProps?.hideProjectionControls);
}

export function ProjectionMenu({ viewportId, className, variant = 'card' }: ProjectionMenuProps) {
  const { t } = useTranslation('WindowLevelActionMenu');
  const shouldHideProjectionControls = useShouldHideProjectionControls(viewportId);
  const { viewportDisplaySets } = useViewportDisplaySets(viewportId);
  const [selectedDisplaySetUID, setSelectedDisplaySetUID] = useState<string | undefined>(
    viewportDisplaySets[0]?.displaySetInstanceUID
  );

  const {
    isOrthographicVolume,
    projectionMode,
    setProjectionMode,
    slabThickness,
    setSlabThickness,
    slabThicknessRange,
  } = useViewportRendering(viewportId, {
    displaySetInstanceUID: selectedDisplaySetUID,
  });

  useEffect(() => {
    const hasSelectedDisplaySet = viewportDisplaySets.some(
      ds => ds.displaySetInstanceUID === selectedDisplaySetUID
    );

    if (viewportDisplaySets.length > 0 && (!selectedDisplaySetUID || !hasSelectedDisplaySet)) {
      setSelectedDisplaySetUID(viewportDisplaySets[0].displaySetInstanceUID);
    }
  }, [viewportDisplaySets, selectedDisplaySetUID]);

  const selectedDisplaySet = useMemo(
    () => viewportDisplaySets.find(ds => ds.displaySetInstanceUID === selectedDisplaySetUID),
    [selectedDisplaySetUID, viewportDisplaySets]
  );

  if (shouldHideProjectionControls || !isOrthographicVolume) {
    return null;
  }

  if (variant === 'toolbar') {
    return (
      <div
        className={cn(
          'bg-popover/80 border-input/60 flex h-10 items-center gap-2 rounded-lg border px-2 shadow-sm backdrop-blur-sm',
          className
        )}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
      >
        <Select
          value={projectionMode}
          onValueChange={value => setProjectionMode(value as ProjectionMode)}
        >
          <SelectTrigger className="h-8 w-[8.5rem]">
            <SelectValue>{t(getProjectionModeLabel(projectionMode))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PROJECTION_MODE_ORDER.map(mode => (
              <SelectItem
                key={mode}
                value={mode}
              >
                {t(getProjectionModeLabel(mode))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Numeric.Container
          mode="singleRange"
          min={slabThicknessRange.min}
          max={slabThicknessRange.max}
          step={slabThicknessRange.step}
          value={slabThickness}
          className="min-w-0 flex-1"
          onChange={(value: number | [number, number]) => {
            if (typeof value === 'number') {
              setSlabThickness(value);
            }
          }}
        >
          <div
            className={cn(
              'flex min-w-0 items-center gap-2',
              projectionMode === PROJECTION_MODES.COMPOSITE && 'opacity-60'
            )}
          >
            <span className="text-muted-foreground shrink-0 text-sm">{t('Slab Thickness')}</span>
            <Numeric.SingleRange
              showNumberInput
              sliderClassName="min-w-[8rem]"
              numberInputClassName="w-20"
            />
          </div>
        </Numeric.Container>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-popover/70 border-input/60 w-80 rounded-lg border p-4 shadow-md backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-base">{t('MIP / Projection')}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSlabThickness(slabThicknessRange.min)}
            >
              {t('Reset')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSlabThickness(slabThicknessRange.max)}
            >
              {t('Full Volume')}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {viewportDisplaySets.length > 1 && (
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm">{t('Display Set')}</span>
              <Select
                value={selectedDisplaySetUID}
                onValueChange={setSelectedDisplaySetUID}
              >
                <SelectTrigger>
                  <SelectValue>{selectedDisplaySet?.label || t('Select Display Set')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {viewportDisplaySets.map(ds => (
                    <SelectItem
                      key={ds.displaySetInstanceUID}
                      value={ds.displaySetInstanceUID}
                    >
                      <SelectItemWithModality displaySet={ds} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-muted-foreground text-sm">{t('Projection Mode')}</span>
            <Select
              value={projectionMode}
              onValueChange={value => setProjectionMode(value as ProjectionMode)}
            >
              <SelectTrigger>
                <SelectValue>{t(getProjectionModeLabel(projectionMode))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROJECTION_MODE_ORDER.map(mode => (
                  <SelectItem
                    key={mode}
                    value={mode}
                  >
                    {t(getProjectionModeLabel(mode))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={projectionMode === PROJECTION_MODES.COMPOSITE ? 'opacity-60' : ''}>
            <Numeric.Container
              mode="singleRange"
              min={slabThicknessRange.min}
              max={slabThicknessRange.max}
              step={slabThicknessRange.step}
              value={slabThickness}
              onChange={(value: number | [number, number]) => {
                if (typeof value === 'number') {
                  setSlabThickness(value);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Numeric.Label className="min-w-28">{t('Slab Thickness')}</Numeric.Label>
                <Numeric.SingleRange
                  showNumberInput
                  numberInputClassName="w-24"
                />
              </div>
            </Numeric.Container>
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>{`${t('Min')}: ${formatThickness(slabThicknessRange.min)} mm`}</span>
              <span>{`${t('Max')}: ${formatThickness(slabThicknessRange.max)} mm`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatThickness(value: number): string {
  return value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function getProjectionModeLabel(mode: ProjectionMode): string {
  switch (mode) {
    case PROJECTION_MODES.MIP:
      return 'MIP (MaxIP)';
    case PROJECTION_MODES.MINIP:
      return 'MinIP';
    case PROJECTION_MODES.AVG:
      return 'AvgIP';
    default:
      return 'Off';
  }
}

export default ProjectionMenu;
