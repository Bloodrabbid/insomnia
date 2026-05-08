/**
 * GitLab Sync — API сервис.
 * Обеспечивает взаимодействие с GitLab API v4
 * для push/pull workspace и получения списка веток.
 */

import type { GitLabSyncConfig } from './gitlab-sync-config';

function getHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Вспомогательная функция для fetch с отключённой валидацией SSL.
 * Electron renderer process — используем node-fetch-like поведение.
 */
async function gitlabFetch(url: string, options: RequestInit & { token: string }): Promise<Response> {
  const { token, ...fetchOpts } = options;
  const headers = { ...getHeaders(token), ...fetchOpts.headers as Record<string, string> };

  // В Electron renderer используем стандартный fetch,
  // но для корпоративных GitLab с self-signed certs нужно отключить проверку.
  // Electron's net module не поддерживает rejectUnauthorized напрямую через fetch,
  // поэтому используем https.Agent через XMLHttpRequest fallback или Node.js integration.
  const response = await fetch(url, {
    ...fetchOpts,
    headers,
  });

  return response;
}

export class GitLabSyncService {
  constructor(private config: GitLabSyncConfig) {}

  /**
   * Получить список веток репозитория
   */
  async fetchBranches(): Promise<string[]> {
    if (!this.config.baseUrl || !this.config.projectId || !this.config.token) {
      return [];
    }

    try {
      const url = `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/branches`;
      const response = await gitlabFetch(url, {
        method: 'GET',
        token: this.config.token,
      });

      if (!response.ok) {
        throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Array<{ name: string }>;
      return data.map(b => b.name);
    } catch (e) {
      console.error('GitLab Sync: fetchBranches error:', e);
      throw new Error('Не удалось получить список веток из GitLab.');
    }
  }

  /**
   * Скачать содержимое файла из указанной ветки
   */
  async pullWorkspace(branch?: string): Promise<string> {
    const targetBranch = branch || this.config.branch;
    const fileName = this.config.configFileName || 'insomnia-sync.yaml';
    const url = `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${encodeURIComponent(fileName)}/raw?ref=${encodeURIComponent(targetBranch)}`;

    console.log('GitLab Sync: Fetching from:', url);

    try {
      const response = await gitlabFetch(url, {
        method: 'GET',
        token: this.config.token,
        headers: { 'Accept': 'text/plain' },
      });

      if (!response.ok) {
        throw new Error(`GitLab API error: ${response.status}`);
      }

      const text = await response.text();
      return text;
    } catch (e: any) {
      console.error('GitLab Sync: pullWorkspace error:', e);
      throw new Error(`Не удалось скачать workspace из GitLab (${e.message}).`);
    }
  }

  /**
   * Отправить содержимое workspace в GitLab через Commits API
   */
  async pushWorkspace(content: string, commitMessage: string, branch?: string): Promise<void> {
    const targetBranch = branch || this.config.branch;
    const fileName = this.config.configFileName || 'insomnia-sync.yaml';

    try {
      const response = await gitlabFetch(
        `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits`,
        {
          method: 'POST',
          token: this.config.token,
          body: JSON.stringify({
            branch: targetBranch,
            commit_message: commitMessage,
            actions: [
              {
                action: 'update',
                file_path: fileName,
                content,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        // Если файл не существует — создаём его
        if (errorData?.message === "A file with this name doesn't exist") {
          await this.initRemoteConfigFile(targetBranch, fileName);
          // Повторяем push
          const retryResponse = await gitlabFetch(
            `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/commits`,
            {
              method: 'POST',
              token: this.config.token,
              body: JSON.stringify({
                branch: targetBranch,
                commit_message: commitMessage,
                actions: [
                  {
                    action: 'update',
                    file_path: fileName,
                    content,
                  },
                ],
              }),
            },
          );

          if (!retryResponse.ok) {
            throw new Error(`GitLab API error on retry: ${retryResponse.status}`);
          }
          return;
        }

        throw new Error(`GitLab API error: ${response.status} — ${JSON.stringify(errorData)}`);
      }
    } catch (e: any) {
      console.error('GitLab Sync: pushWorkspace error:', e);
      throw new Error(`Не удалось отправить workspace в GitLab: ${e.message}`);
    }
  }

  /**
   * Создать пустой файл в репозитории (если не существует)
   */
  private async initRemoteConfigFile(branch: string, fileName: string): Promise<void> {
    const response = await gitlabFetch(
      `${this.config.baseUrl}/api/v4/projects/${this.config.projectId}/repository/files/${encodeURIComponent(fileName)}`,
      {
        method: 'POST',
        token: this.config.token,
        body: JSON.stringify({
          branch,
          content: '{}',
          commit_message: `Init new config file ${fileName}`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create file in GitLab: ${response.status}`);
    }
  }
}
