import type { BaseModel } from './types';

export interface SavedTab {
  type: string;
  name: string;
  url: string;
  organizationId: string;
  projectId: string;
  workspaceId: string;
  projectName: string;
  workspaceName: string;
  id: string;
  tag?: string;
  method?: string;
  requestUrl?: string;
  temporary?: boolean;
}

export interface TabSession extends BaseModel {
  name: string;
  tabs: SavedTab[];
  activeTabId: string | null;
}

export const name = 'Tab Session';
export const type = 'TabSession';
export const prefix = 'tsn';
export const canDuplicate = true;
export const canSync = true;

export function init(): Partial<TabSession> {
  return {
    name: 'New Session',
    tabs: [],
    activeTabId: null,
  };
}
