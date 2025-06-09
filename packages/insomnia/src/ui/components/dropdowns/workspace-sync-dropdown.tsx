import { type FC } from 'react';
import React from 'react';
import { useRouteLoaderData } from 'react-router';

import { isGitProject } from '../../../models/project';
import { useOrganizationPermissions } from '../../hooks/use-organization-features';
import { useRootLoaderData } from '../../routes/root';
import type { WorkspaceLoaderData } from '../../routes/workspace';
import { GitProjectSyncDropdown } from './git-project-sync-dropdown';
import { GitSyncDropdown } from './git-sync-dropdown';

export const WorkspaceSyncDropdown: FC = () => {
  const { activeProject, activeWorkspace, gitRepository, activeWorkspaceMeta } = useRouteLoaderData(
    ':workspaceId',
  ) as WorkspaceLoaderData;

  const { userSession } = useRootLoaderData();
  const { features } = useOrganizationPermissions();

  // В локальной версии показываем только Git sync для локальных репозиториев
  const shouldShowGitSyncDropdown =
    features.gitSync.enabled && activeWorkspaceMeta?.gitRepositoryId;
    
  if (shouldShowGitSyncDropdown) {
    if (isGitProject(activeProject)) {
      return <GitProjectSyncDropdown key={gitRepository?._id} gitRepository={gitRepository} />;
    }

    if (gitRepository) {
      return (
        <GitSyncDropdown
          key={gitRepository?._id}
          isInsomniaSyncEnabled={false} // Отключаем Insomnia Sync в локальной версии
          gitRepository={gitRepository}
          showDeprecatedWarning={false} // Убираем предупреждение в локальной версии
        />
      );
    }
  }

  return null;
};
