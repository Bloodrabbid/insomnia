// Облачная синхронизация отключена для локальной версии

export class VCS {
  _store: any;
  _backendProject: any = null;

  constructor(store: any, conflictResolver?: any) {
    this._store = store;
    // Игнорируем conflictResolver в локальной версии
    console.log('[sync] VCS initialized in local mode', conflictResolver ? 'with conflict resolver' : 'without conflict resolver');
  }

  async archiveProject() {
    console.log('[sync] Cloud sync disabled in local version');
  }

  async localBackendProjects() {
    return [];
  }

  async remoteBackendProjects(options?: any) {
    console.log('[sync] Remote backend projects disabled in local version', options);
    return [];
  }

  async status(candidates?: any) {
    console.log('[sync] Status disabled in local version', candidates);
    return {
      stage: {},
      unstaged: {},
    };
  }

  async stage(items?: any) {
    console.log('[sync] Stage disabled in local version', items);
  }

  async commit() {
    console.log('[sync] Commit disabled in local version');
  }

  async push(options?: any) {
    console.log('[sync] Push disabled in local version', options);
  }

  async pull(options?: any) {
    console.log('[sync] Pull disabled in local version', options);
  }

  hasBackendProject() {
    return false;
  }

  takeSnapshot(message?: string) {
    console.log('[sync] Take snapshot disabled in local version', message);
  }

  allDocuments() {
    return [];
  }

  setBackendProject(project?: any) {
    console.log('[sync] Set backend project disabled in local version', project);
  }

  checkout(items?: any, branch?: string) {
    console.log('[sync] Checkout disabled in local version', items, branch);
  }

  async customFetch() {
    throw new Error('Cloud sync disabled in local version');
  }

  async getRemoteBranchNames() {
    return [];
  }

  async compareRemoteBranch() {
    return { ahead: 0, behind: 0 };
  }

  async switchAndCreateBackendProjectIfNotExist(workspaceId?: string, workspaceName?: string) {
    console.log('[sync] Switch backend project disabled in local version', workspaceId, workspaceName);
  }

  newInstance() {
    return new VCS(this._store);
  }
} 
