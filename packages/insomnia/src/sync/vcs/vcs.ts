// Облачная синхронизация отключена для локальной версии

export class VCS {
  _store: any;
  _backendProject: any = null;

  constructor(store: any) {
    this._store = store;
  }

  async archiveProject() {
    console.log('[sync] Cloud sync disabled in local version');
  }

  async localBackendProjects() {
    return [];
  }

  async remoteBackendProjects() {
    return [];
  }

  async status() {
    return {
      stage: {},
      unstaged: {},
    };
  }

  async stage() {
    console.log('[sync] Stage disabled in local version');
  }

  async commit() {
    console.log('[sync] Commit disabled in local version');
  }

  async push() {
    console.log('[sync] Push disabled in local version');
  }

  async pull() {
    console.log('[sync] Pull disabled in local version');
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

  async switchAndCreateBackendProjectIfNotExist() {
    console.log('[sync] Switch backend project disabled in local version');
  }

  newInstance() {
    return new VCS(this._store);
  }
} 
