import React, { type FC, useCallback, useEffect, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components';
import { useParams } from 'react-router';
import { database } from '~/common/database';
import { models } from '~/insomnia-data';
import { useInsomniaTabContext } from '../../context/app/insomnia-tab-context';
import { Icon } from '../icon';
import { showModal } from '../modals';
import { PromptModal } from '../modals/prompt-modal';
import { AskModal } from '../modals/ask-modal';

export const TabSessionMenu: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentOrgTabs, saveTabSession, loadTabSession } = useInsomniaTabContext();
  const [sessions, setSessions] = useState<any[]>([]);

  const refreshSessions = useCallback(async () => {
    if (!workspaceId) return;
    const sessions = await database.find(models.tabSession.type, { parentId: workspaceId });
    setSessions(sessions.sort((a, b) => b.modified - a.modified));
  }, [workspaceId]);

  useEffect(() => {
    refreshSessions();
    const unsubscribe = window.main.on('db.changes', async (_, changes) => {
      if (changes.some(([, doc]) => doc.type === models.tabSession.type)) {
        refreshSessions();
      }
    });
    return () => unsubscribe();
  }, [refreshSessions]);

  const handleSave = () => {
    const tabNames = currentOrgTabs.tabList.slice(0, 3).map(t => t.name).join(', ');
    const defaultName = tabNames ? `${tabNames}${currentOrgTabs.tabList.length > 3 ? '...' : ''}` : 'New Session';

    showModal(PromptModal, {
      title: 'Save Tab Session',
      defaultValue: defaultName,
      submitName: 'Save',
      label: 'Session Name',
      onComplete: async (name: string) => {
        await saveTabSession(name);
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    showModal(AskModal, {
      title: 'Delete Session',
      message: `Are you sure you want to delete session "${name}"?`,
      yesText: 'Delete',
      noText: 'Cancel',
      color: 'danger',
      onDone: async (success: boolean) => {
        if (success) {
          await database.removeWhere(models.tabSession.type, { _id: id });
        }
      },
    });
  };

  return (
    <MenuTrigger>
      <Button
        aria-label="Tab Sessions"
        className="flex items-center gap-1 rounded-xs px-2 py-1 text-xs text-(--hl) hover:bg-(--hl-xs) focus:outline-hidden aria-pressed:bg-(--hl-sm)"
      >
        <Icon icon="layer-group" />
        <span>Sessions</span>
      </Button>
      <Popover placement="bottom end">
        <Menu className="max-h-[85vh] min-w-[200px] overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) py-2 text-sm shadow-lg select-none focus:outline-hidden">
          <MenuItem
            onAction={handleSave}
            className="flex h-(--line-height-xs) w-full items-center gap-2 bg-transparent px-(--padding-md) whitespace-nowrap text-(--color-font) transition-colors hover:bg-(--hl-sm) focus:bg-(--hl-xs) focus:outline-hidden disabled:cursor-not-allowed"
          >
            <Icon icon="save" className="w-3" />
            <span>Save current tabs...</span>
          </MenuItem>
          {sessions.length > 0 && <Separator className="my-1 h-px bg-(--hl-sm)" />}
          {sessions.map(session => (
            <MenuItem
              key={session._id}
              className="group flex h-(--line-height-xs) w-full items-center justify-between gap-2 bg-transparent px-(--padding-md) whitespace-nowrap text-(--color-font) transition-colors hover:bg-(--hl-sm) focus:bg-(--hl-xs) focus:outline-hidden"
              onAction={() => loadTabSession(session)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Icon icon="bookmark" className="w-3 shrink-0 text-(--color-info)" />
                <span className="truncate">{session.name}</span>
                <span className="text-[10px] opacity-50">({session.tabs.length})</span>
              </div>
              <div
                className="flex items-center justify-center h-full px-2 -mr-2 cursor-pointer"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete(session._id, session.name);
                }}
              >
                <button
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-(--color-danger) outline-hidden flex items-center justify-center p-1"
                >
                  <Icon icon="trash-can" className="w-4" />
                </button>
              </div>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
};
