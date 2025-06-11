import classNames from 'classnames';
import React, { useCallback } from 'react';
import { Button } from 'react-aria-components';

import { scrollElementIntoView } from '../../../utils';
import { useInsomniaTabContext } from '../../context/app/insomnia-tab-context';
import { Icon } from '../icon';
import { Tooltip } from '../tooltip';
import type { BaseTab, TabType } from './tab';

const REQUEST_METHOD_STYLE_MAP: Record<string, string> = {
  GET: 'text-[--color-font-surprise] bg-[rgba(var(--color-surprise-rgb),0.5)]',
  POST: 'text-[--color-font-success] bg-[rgba(var(--color-success-rgb),0.5)]',
  GQL: 'text-[--color-font-success] bg-[rgba(var(--color-success-rgb),0.5)]',
  HEAD: 'text-[--color-font-info] bg-[rgba(var(--color-info-rgb),0.5)]',
  OPTIONS: 'text-[--color-font-info] bg-[rgba(var(--color-info-rgb),0.5)]',
  DELETE: 'text-[--color-font-danger] bg-[rgba(var(--color-danger-rgb),0.5)]',
  PUT: 'text-[--color-font-warning] bg-[rgba(var(--color-warning-rgb),0.5)]',
  PATCH: 'text-[--color-font-notice] bg-[rgba(var(--color-notice-rgb),0.5)]',
  WS: 'text-[--color-font-notice] bg-[rgba(var(--color-notice-rgb),0.5)]',
  gRPC: 'text-[--color-font-info] bg-[rgba(var(--color-info-rgb),0.5)]',
};

const WORKSPACE_TAB_UI_MAP: Partial<Record<TabType, any>> = {
  collection: {
    icon: 'bars',
    bgColor: 'bg-[--color-surprise]',
    textColor: 'text-[--color-font-surprise]',
  },
  environment: {
    icon: 'code',
    bgColor: 'bg-[--color-font]',
    textColor: 'text-[--color-bg]',
  },
  mockServer: {
    icon: 'server',
    bgColor: 'bg-[--color-warning]',
    textColor: 'text-[--color-font-warning]',
  },
  document: {
    icon: 'file',
    bgColor: 'bg-[--color-info]',
    textColor: 'text-[--color-font-info]',
  },
};

export const SimpleTab = ({ tab, isActive, onTogglePin }: { tab: BaseTab; isActive?: boolean; onTogglePin?: (tabId: string) => void }) => {
  const { closeTabById, currentOrgTabs } = useInsomniaTabContext();

  const renderTabIcon = (type: TabType) => {
    if (WORKSPACE_TAB_UI_MAP[type]) {
      return (
        <div
          className={`${WORKSPACE_TAB_UI_MAP[type].bgColor} ${WORKSPACE_TAB_UI_MAP[type].textColor} flex h-[20px] w-[20px] items-center justify-center rounded-s-sm px-2`}
        >
          <Icon icon={WORKSPACE_TAB_UI_MAP[type].icon as any} />
        </div>
      );
    }

    if (type === 'request' || type === 'mockRoute') {
      return (
        <span
          aria-label="Tab Tag"
          className={`flex w-10 flex-shrink-0 items-center justify-center rounded-sm border border-solid border-[--hl-sm] text-[0.65rem] ${REQUEST_METHOD_STYLE_MAP[tab?.method || tab?.tag || '']}`}
        >
          {tab.tag}
        </span>
      );
    }

    if (type === 'folder') {
      return <Icon icon={'folder' as any} />;
    }
    if (type === 'runner') {
      return <Icon icon={'play' as any} />;
    }

    if (type === 'testSuite') {
      return <Icon icon={'check' as any} />;
    }

    return null;
  };

  const handleClose = (id: string) => {
    closeTabById(id);
  };

  const handleAuxClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, id: string) => {
    // If mouse middle button clicked, close tab
    if (e.button === 1) {
      handleClose(id);
    }
  };

  const { updateTabById } = useInsomniaTabContext();

  const handleDoubleClick = () => {
    if (tab.temporary) {
      updateTabById?.(tab.id, { temporary: false });
    }
  };

  return (
    <Tooltip delay={1000} message={`${tab.projectName} / ${tab.workspaceName}`} className="h-full">
      <div
        onDoubleClick={handleDoubleClick}
        onAuxClick={e => handleAuxClick(e, tab.id)}
        className={`relative flex h-full max-w-[200px] cursor-pointer flex-nowrap items-center border-r border-solid border-[--hl-sm] px-[10px] outline-none transition-all duration-150 ${
          isActive 
            ? 'bg-[--hl-sm] text-[--color-font] shadow-sm font-medium' 
            : 'opacity-[0.7] hover:text-[--color-font] hover:bg-[--hl-xs] hover:opacity-100'
        }`}
      >
        {renderTabIcon(tab.type)}
        <span
          className={classNames('mx-[8px] overflow-hidden text-ellipsis text-nowrap', {
            italic: tab.temporary,
          })}
        >
          {tab.name}
        </span>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Close Tab"
            data-testid="tab-close-button"
            className="flex h-[15px] w-[15px] items-center justify-center hover:bg-[--hl-md] rounded"
            onPress={() => handleClose(tab.id)}
          >
            <Icon icon={'close' as any} />
          </Button>
          {onTogglePin && (
            <Button
              onPress={() => onTogglePin(tab.id)}
              className={`flex h-[15px] w-[15px] items-center justify-center hover:bg-[--hl-md] rounded transition-colors ${
                tab.pinned ? 'text-yellow-500' : 'text-[--hl] opacity-50 hover:opacity-100'
              }`}
              aria-label={tab.pinned ? 'Открепить' : 'Закрепить'}
            >
              <Icon icon={'star' as any} className={tab.pinned ? '' : 'opacity-60'} />
            </Button>
          )}
        </div>
        <span
          className={`absolute bottom-[0px] left-0 right-0 block h-[2px] bg-[--color-surprise] transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />
        <span
          className={`absolute bottom-[0px] left-0 right-0 block h-[1px] bg-[--hl-sm] ${!isActive ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </Tooltip>
  );
}; 
