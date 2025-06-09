// Remote collections отключены для локальной версии

import { type ActionFunction, type LoaderFunction } from 'react-router';

export const loader: LoaderFunction = async () => {
  return {
    syncItems: [],
    localChanges: 0,
    remoteChanges: [],
    compare: { ahead: 0, behind: 0 },
    branch: 'main',
    remoteBranches: [],
    canPush: false,
    canPull: false,
  };
};

export const pullFromRemoteAction: ActionFunction = async () => {
  throw new Error('Remote collections disabled in local version');
};

export const pushToRemoteAction: ActionFunction = async () => {
  throw new Error('Remote collections disabled in local version');
};

export const stageChangesAction: ActionFunction = async () => {
  throw new Error('Remote collections disabled in local version');
};

export const commitChangesAction: ActionFunction = async () => {
  throw new Error('Remote collections disabled in local version');
};
