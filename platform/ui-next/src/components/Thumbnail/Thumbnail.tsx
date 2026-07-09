import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag } from 'react-dnd';
import { Icons } from '../Icons';
import { TooltipTrigger, TooltipContent, Tooltip } from '../Tooltip';

/**
 * Display a thumbnail for a display set.
 */
const Thumbnail = ({
  displaySetInstanceUID,
  className,
  imageSrc,
  imageContentType,
  imageAltText,
  description,
  seriesNumber,
  numInstances,
  loadingProgress,
  countIcon,
  messages,
  isActive,
  onClick,
  onDoubleClick,
  thumbnailType,
  modality,
  viewPreset = 'thumbnails',
  isHydratedForDerivedDisplaySet = false,
  isTracked = false,
  canReject = false,
  dragData = {},
  onReject = () => {},
  onClickUntrack = () => {},
  ThumbnailMenuItems = () => {},
}: withAppTypes): React.ReactNode => {
  // TODO: We should wrap our thumbnail to create a "DraggableThumbnail", as
  // this will still allow for "drag", even if there is no drop target for the
  // specified item.
  const [collectedProps, drag, dragPreview] = useDrag({
    type: 'displayset',
    item: { ...dragData },
    canDrag: function (monitor) {
      return Object.keys(dragData).length !== 0;
    },
  });

  const lastTapRef = useRef(0);
  const suppressClickRef = useRef(false);
  const doubleTapDelay = 300;

  const isInteractiveTarget = target => {
    return (
      target instanceof HTMLElement &&
      !!target.closest('button,a,[role="menuitem"],[data-radix-collection-item]')
    );
  };

  const handleTouchEnd = e => {
    if (isInteractiveTarget(e.target)) {
      return;
    }

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);

    if (e.cancelable) {
      e.preventDefault();
    }

    const currentTime = Date.now();
    const tapLength = currentTime - lastTapRef.current;

    if (tapLength < doubleTapDelay && tapLength > 0) {
      lastTapRef.current = 0;
      onDoubleClick(e);
      return;
    }

    lastTapRef.current = currentTime;
    onClick(e);
  };

  const handleClick = e => {
    if (suppressClickRef.current) {
      e.preventDefault();
      return;
    }

    onClick(e);
  };

  const renderThumbnailPreset = () => {
    const isPdfPreview = imageContentType === 'application/pdf';

    return (
      <div
        className={classnames(
          'flex h-full w-full flex-col items-center justify-center gap-[2px] p-[4px]',
          isActive && 'bg-popover rounded'
        )}
      >
        <div className="study-browser__thumbnail-preview h-[142px] w-[160px]">
          <div className="bg-background relative">
            {imageSrc && isPdfPreview ? (
              <object
                data={imageSrc}
                type="application/pdf"
                aria-label={imageAltText || description}
                className="study-browser__thumbnail-preview-media pointer-events-none h-[142px] w-[160px] rounded bg-white"
              >
                <div className="study-browser__thumbnail-preview-media bg-background text-foreground flex h-[142px] w-[160px] items-center justify-center rounded text-[13px] font-semibold">
                  PDF
                </div>
              </object>
            ) : imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAltText}
                className="study-browser__thumbnail-preview-media h-[142px] w-[160px] rounded object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="study-browser__thumbnail-preview-media bg-background h-[142px] w-[160px] rounded"></div>
            )}

            {/* bottom left */}
            <div className="absolute bottom-0 left-0 flex h-[14px] items-center gap-[4px] rounded-tr pt-[10px] pb-[10px] pr-[6px] pl-[5px]">
              <div
                className={classnames(
                  'h-[10px] w-[10px] rounded-[2px]',
                  isActive || isHydratedForDerivedDisplaySet ? 'bg-highlight' : 'bg-primary/65',
                  loadingProgress && loadingProgress < 1 && 'bg-primary/25'
                )}
              ></div>
              <div
                className="text-foreground text-[11px] font-semibold"
                data-cy="series-modality-label"
              >
                {modality}
              </div>
            </div>

            {/* top right */}
            <div className="absolute top-0 right-0 flex items-center gap-[4px]">
              {isTracked && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="group">
                      <Icons.StatusTracking className="text-primary h-[15px] w-[15px] group-hover:hidden" />
                      <Icons.Cancel
                        className="text-primary hidden h-[15px] w-[15px] group-hover:block"
                        onClick={onClickUntrack}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-1 flex-row">
                      <div className="flex-2 flex items-center justify-center pr-4">
                        <Icons.InfoLink className="text-primary" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span>
                          <span className="text-foreground">
                            {isTracked ? 'Series is tracked' : 'Series is untracked'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* bottom right */}
            <div className="absolute bottom-0 right-0 flex items-center gap-[4px] p-[4px]">
              <ThumbnailMenuItems
                displaySetInstanceUID={displaySetInstanceUID}
                canReject={canReject}
                onReject={onReject}
              />
            </div>
          </div>
        </div>
        <div className="study-browser__thumbnail-details flex h-[54px] w-[160px] flex-col justify-start pt-px">
          <Tooltip>
            <TooltipContent>{description}</TooltipContent>
            <TooltipTrigger>
              <div
                className="study-browser__thumbnail-description text-foreground min-h-[18px] w-[160px] overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 pl-1 text-left text-[12px] font-normal leading-4"
                data-cy="series-description-label"
              >
                {description}
              </div>
            </TooltipTrigger>
          </Tooltip>
          <div className="flex h-[12px] items-center gap-[7px] overflow-hidden">
            <div className="text-muted-foreground pl-1 text-[11px]"> S:{seriesNumber}</div>
            <div className="text-muted-foreground text-[11px]">
              <div className="flex items-center gap-[4px]">
                {countIcon ? (
                  React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'w-3' })
                ) : (
                  <Icons.InfoSeries className="w-3" />
                )}
                <div>{numInstances}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListPreset = () => {
    return (
      <div
        className={classnames(
          'flex h-full w-full items-center justify-between pr-[8px] pl-[8px] pt-[4px] pb-[4px]',
          isActive && 'bg-popover rounded'
        )}
      >
        <div className="relative flex h-[32px] w-full items-center gap-[8px] overflow-hidden">
          <div
            className={classnames(
              'h-[32px] w-[4px] min-w-[4px] rounded',
              isActive || isHydratedForDerivedDisplaySet ? 'bg-highlight' : 'bg-primary/65',
              loadingProgress && loadingProgress < 1 && 'bg-primary/25'
            )}
          ></div>
          <div className="flex h-full w-[calc(100%-12px)] flex-col justify-start">
            <div className="flex items-center gap-[7px]">
              <div
                className="text-foreground text-[13px] font-semibold"
                data-cy="series-modality-label"
              >
                {modality}
              </div>
              <Tooltip>
                <TooltipContent>{description}</TooltipContent>
                <TooltipTrigger className="w-full overflow-hidden">
                  <div
                    className="text-foreground max-w-[160px] overflow-hidden overflow-ellipsis whitespace-nowrap text-left text-[13px] font-normal"
                    data-cy="series-description-label"
                  >
                    {description}
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </div>

            <div className="flex h-[12px] items-center gap-[7px] overflow-hidden">
              <div className="text-muted-foreground text-[12px]"> S:{seriesNumber}</div>
              <div className="text-muted-foreground text-[12px]">
                <div className="flex items-center gap-[4px]">
                  {' '}
                  {countIcon ? (
                    React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'w-3' })
                  ) : (
                    <Icons.InfoSeries className="w-3" />
                  )}
                  <div>{numInstances}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-full items-center gap-[4px]">
          {isTracked && (
            <Tooltip>
              <TooltipTrigger>
                <div className="group">
                  <Icons.StatusTracking className="text-primary h-[20px] w-[15px] group-hover:hidden" />
                  <Icons.Cancel
                    className="text-primary hidden h-[15px] w-[15px] group-hover:block"
                    onClick={onClickUntrack}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-1 flex-row">
                  <div className="flex-2 flex items-center justify-center pr-4">
                    <Icons.InfoLink className="text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span>
                      <span className="text-foreground">
                        {isTracked ? 'Series is tracked' : 'Series is untracked'}
                      </span>
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <ThumbnailMenuItems
            displaySetInstanceUID={displaySetInstanceUID}
            canReject={canReject}
            onReject={onReject}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={classnames(
        className,
        'study-browser__thumbnail bg-muted hover:bg-primary/30 group flex cursor-pointer select-none flex-col rounded outline-none',
        viewPreset === 'thumbnails' && 'h-[204px] w-[168px]',
        viewPreset === 'list' && 'h-[40px] w-full'
      )}
      id={`thumbnail-${displaySetInstanceUID}`}
      data-cy={
        thumbnailType === 'thumbnailNoImage'
          ? 'study-browser-thumbnail-no-image'
          : 'study-browser-thumbnail'
      }
      data-series={seriesNumber}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      role="button"
    >
      <div
        ref={drag}
        className="h-full w-full"
      >
        {viewPreset === 'thumbnails' && renderThumbnailPreset()}
        {viewPreset === 'list' && renderListPreset()}
      </div>
    </div>
  );
};

Thumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string.isRequired,
  className: PropTypes.string,
  imageSrc: PropTypes.string,
  imageContentType: PropTypes.string,
  /**
   * Data the thumbnail should expose to a receiving drop target. Use a matching
   * `dragData.type` to identify which targets can receive this draggable item.
   * If this is not set, drag-n-drop will be disabled for this thumbnail.
   *
   * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
   */
  dragData: PropTypes.shape({
    /** Must match the "type" a dropTarget expects */
    type: PropTypes.string.isRequired,
  }),
  imageAltText: PropTypes.string,
  description: PropTypes.string.isRequired,
  seriesNumber: PropTypes.any,
  numInstances: PropTypes.number.isRequired,
  loadingProgress: PropTypes.number,
  messages: PropTypes.object,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
  modality: PropTypes.string,
  isHydratedForDerivedDisplaySet: PropTypes.bool,
  isTracked: PropTypes.bool,
  onClickUntrack: PropTypes.func,
  countIcon: PropTypes.string,
  thumbnailType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage']),
};

export { Thumbnail };
