import type { Workspace } from '~/insomnia-data';
import { services } from '~/insomnia-data';
import { exportWorkspacesHAR } from '../../common/har';
import { fetchImportContentFromURI, importResourcesToProject, importResourcesToWorkspace, scanResources } from '../../common/import';
import * as db from '../../common/database';
import * as models from '../../models';
import { getInsomniaV5DataExport } from '../../common/insomnia-v5';


interface InsomniaExport {
  workspace?: Workspace;
  includePrivate?: boolean;
}

type HarExport = Omit<InsomniaExport, 'format'>;

const getWorkspaces = (activeProjectId?: string) => {
  if (activeProjectId) {
    return services.workspace.findByParentId(activeProjectId);
  }
  // This code path was kept in case there was ever a time when the app wouldn't have an active project.
  // In over 5 months of monitoring in production, we never saw this happen.
  // Keeping it for defensive purposes, but it's not clear if it's necessary.
  return services.workspace.all();
};

// Only in the case of running unit tests from Inso can activeProjectId be undefined. This is because the concept of a project doesn't exist in git/insomnia sync or an export file
export const init = (activeProjectId?: string) => ({
  data: {
    import: {
      uri: async (uri: string) => {
        if (!activeProjectId) {
          return;
        }

        const content = await fetchImportContentFromURI({
          uri,
        });

        await scanResources([
          {
            contentStr: content,
          },
        ]);

        await importResourcesToProject({
          projectId: activeProjectId,
        });
      },
      raw: async (content: string) => {
        if (!activeProjectId) {
          return;
        }
        await scanResources([
          {
            contentStr: content,
          },
        ]);

        await importResourcesToProject({
          projectId: activeProjectId,
        });
      },
      toCurrentWorkspace: async (content: string, workspaceId: string) => {
        await scanResources([
          {
            contentStr: content,
          },
        ]);

        await importResourcesToWorkspace({
          workspaceId,
        });
      },
      clearWorkspace: async (workspaceId: string) => {
        const workspace = await db.database.findOne<models.Workspace>(models.workspace.type, { _id: workspaceId });
        if (!workspace) {
          return;
        }
        const descendants = await db.database.getWithDescendants(workspace);
        // Фильтруем, чтобы не удалить сам воркспейс
        const toDelete = descendants.filter(d => d._id !== workspaceId);
        await db.database.batchModifyDocs({ upsert: [], remove: toDelete });
      },
    },
    export: {
      insomnia: async ({ workspace }: { workspace: Workspace }) => {
        if (workspace) {
          const insomniaExport = await getInsomniaV5DataExport({
            workspaceId: workspace._id,
            includePrivateEnvironments: false,
          });

          return [insomniaExport];
        }

        const workspaces = await getWorkspaces(activeProjectId);

        const allInsomniaExports = [];

        for (const workspace of workspaces) {
          const insomniaExport = await getInsomniaV5DataExport({
            workspaceId: workspace._id,
            includePrivateEnvironments: false,
          });
          allInsomniaExports.push(insomniaExport);
        }

        return allInsomniaExports;
      },

      har: async ({ workspace, includePrivate }: HarExport = {}) =>
        exportWorkspacesHAR(workspace ? [workspace] : await getWorkspaces(activeProjectId), Boolean(includePrivate)),
    },
  },
});
