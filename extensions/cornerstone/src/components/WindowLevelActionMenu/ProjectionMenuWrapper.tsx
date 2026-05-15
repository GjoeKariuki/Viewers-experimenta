import React, { ReactNode } from 'react';
import ProjectionMenu, { useShouldHideProjectionControls } from './ProjectionMenu';

type ProjectionMenuWrapperProps = {
  viewportId: string;
  disabled?: boolean;
};

export function ProjectionMenuWrapper(props: ProjectionMenuWrapperProps): ReactNode {
  const { viewportId, disabled } = props;
  const shouldHideProjectionControls = useShouldHideProjectionControls(viewportId);

  if (disabled || shouldHideProjectionControls) {
    return null;
  }

  return (
    <ProjectionMenu
      viewportId={viewportId}
      variant="toolbar"
    />
  );
}
