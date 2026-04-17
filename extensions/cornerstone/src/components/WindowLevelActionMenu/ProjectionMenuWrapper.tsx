import React, { ReactNode } from 'react';
import ProjectionMenu from './ProjectionMenu';

type ProjectionMenuWrapperProps = {
  viewportId: string;
  disabled?: boolean;
};

export function ProjectionMenuWrapper(props: ProjectionMenuWrapperProps): ReactNode {
  const { viewportId, disabled } = props;

  if (disabled) {
    return null;
  }

  return <ProjectionMenu viewportId={viewportId} variant="toolbar" />;
}
