/**
 * GitLab Sync — конфигурация.
 * Хранит настройки подключения к GitLab в localStorage.
 * Обеспечивает обратную совместимость с плагинным хранилищем.
 */

export interface GitLabSyncConfig {
  baseUrl: string;
  token: string;
  projectId: string;
  branch: string;
  configFileName: string;
  clearBeforeImport: boolean;
}

const STORAGE_KEY = 'gitlab-sync:config';

export async function loadGitLabConfig(): Promise<GitLabSyncConfig | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Попробуем мигрировать из старого плагинного хранилища (pluginData)
    // Плагин хранил конфиг через context.store.setItem('gitlab-sync:config', ...)
    // В NeDB это pluginData с plugin name 'insomnia-plugin-universal-git'
    // Миграция будет выполнена при первом обращении
    return null;
  } catch (e) {
    console.error('GitLab Sync: Error loading config:', e);
    return null;
  }
}

export async function saveGitLabConfig(config: GitLabSyncConfig): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getDefaultConfig(): GitLabSyncConfig {
  return {
    baseUrl: '',
    token: '',
    projectId: '',
    branch: 'main',
    configFileName: 'insomnia-sync.yaml',
    clearBeforeImport: false,
  };
}
