import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from 'react-aria-components';
import { Icon } from '../icon';
import type { BaseTab } from './tab';
import { SimpleTab } from './simple-tab';
import { useInsomniaTabContext } from '../../context/app/insomnia-tab-context';
import { useRouteLoaderData, useParams } from 'react-router';
import { getRenderContext, render } from '../../../common/render';
import type { WorkspaceLoaderData } from '../../routes/workspace';
import * as models from '../../../models';
import { type ChangeBufferEvent, type ChangeType, database } from '../../../common/database';
import { isRequest, type Request } from '../../../models/request';
import { isRequestGroup } from '../../../models/request-group';
import type { MockRoute } from '../../../models/mock-route';
import { formatMethodName, getRequestMethodShortHand } from '../tags/method-tag';

interface TabGroup {
  key: string;
  title: string;
  tabs: BaseTab[];
}

interface EnhancedTab extends BaseTab {
  realUrl?: string;
}

export const SimpleTabList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [enhancedTabsState, setEnhancedTabsState] = useState<EnhancedTab[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const { currentOrgTabs, updateTabById, changeActiveTab, batchUpdateTabs } = useInsomniaTabContext();
  const { tabList, activeTabId } = currentOrgTabs;
  const workspaceData = useRouteLoaderData(':workspaceId') as WorkspaceLoaderData;
  const { organizationId, projectId } = useParams();

  // Функция для проверки, нужно ли обрабатывать изменение
  const needHandleChange = (changeType: ChangeType, docType: string) => {
    if (changeType !== 'update' && changeType !== 'remove') {
      return false;
    }
    const list = [
      models.request.type,
      models.grpcRequest.type,
      models.webSocketRequest.type,
      models.requestGroup.type,
      models.unitTestSuite.type,
      models.workspace.type,
      models.environment.type,
      models.mockRoute.type,
      models.project.type,
    ];
    return list.includes(docType);
  };

  // Функция для обновления табов при изменении модели
  const handleUpdate = useCallback(
    async (doc: models.BaseModel, patches: Partial<models.BaseModel>[] = []) => {
      const patchObj: Record<string, any> = {};
      patches.forEach(patch => {
        Object.assign(patchObj, patch);
      });
      // только нужно обрабатывать изменения name, method, parentId
      if (!patchObj.name && !patchObj.method && !patchObj.parentId) {
        return;
      }
      if (patchObj.name) {
        if (doc.type !== models.project.type && doc.type !== models.workspace.type) {
          updateTabById?.(doc._id, {
            name: doc.name,
          });
        }
      }

      if (patchObj.method) {
        if (
          doc.type === models.request.type ||
          doc.type === models.grpcRequest.type ||
          doc.type === models.webSocketRequest.type
        ) {
          const tag = getRequestMethodShortHand(doc as Request);
          const method = (doc as Request).method;
          updateTabById?.(doc._id, {
            method,
            tag,
          });
        } else if (doc.type === models.mockRoute.type) {
          const method = (doc as MockRoute).method;
          const tag = formatMethodName(method);
          updateTabById?.(doc._id, {
            method,
            tag,
          });
        }
      }

      // переместить запрос или requestGroup в другую коллекцию
      if (patchObj.parentId && !patchObj.metaSortKey && (patchObj.parentId as string).startsWith('wrk_')) {
        const workspace = await models.workspace.getById(patchObj.parentId);
        if (workspace) {
          if (isRequest(doc)) {
            updateTabById?.(doc._id, {
              workspaceId: workspace._id,
              workspaceName: workspace.name,
              url: `/organization/${organizationId}/project/${projectId}/workspace/${workspace._id}/debug/request/${doc._id}`,
            });
          } else if (isRequestGroup(doc)) {
            const folderEntities = await database.withDescendants(doc, models.request.type, [
              models.request.type,
              models.requestGroup.type,
            ]);
            const batchUpdates = [doc, ...folderEntities].map(entity => {
              return {
                id: entity._id,
                fields: {
                  workspaceId: workspace._id,
                  workspaceName: workspace.name,
                  url: isRequestGroup(entity)
                    ? `/organization/${organizationId}/project/${projectId}/workspace/${workspace._id}/debug/request-group/${entity._id}`
                    : `/organization/${organizationId}/project/${projectId}/workspace/${workspace._id}/debug/request/${entity._id}`,
                },
              };
            });
            batchUpdateTabs?.(batchUpdates);
          }
        }
      }
    },
    [organizationId, projectId, updateTabById, batchUpdateTabs],
  );

  // Слушаем изменения в базе данных для синхронизации табов
  useEffect(() => {
    const callback = async (changes: ChangeBufferEvent[]) => {
      for (const change of changes) {
        const changeType = change[0];
        const doc = change[1];
        if (needHandleChange(changeType, doc.type)) {
          if (changeType === 'update') {
            const patches = change[3];
            handleUpdate(doc, patches);
          }
        }
      }
    };
    database.onChange(callback);

    return () => {
      database.offChange(callback);
    };
  }, [handleUpdate]);

  // Загружаем реальные URL для запросов с разрешенными переменными среды
  useEffect(() => {
    const loadRequestUrls = async () => {
      if (!tabList?.length || !workspaceData?.activeEnvironment) return;
      
      const enhanced = await Promise.all(
        tabList.map(async (tab) => {
          if (tab.type === 'request') {
            try {
              const request = await models.request.getById(tab.id);
              if (request && request.url) {
                try {
                  // Получаем контекст рендеринга для разрешения переменных среды
                  const renderContext = await getRenderContext({
                    request,
                    environment: workspaceData.activeEnvironment._id,
                    purpose: 'send',
                  });
                  
                  // Разрешаем переменные среды в URL
                  const renderedUrl = await render(request.url, renderContext, null, 'keep');
                  
                  return {
                    ...tab,
                    realUrl: typeof renderedUrl === 'string' ? renderedUrl : (request.url || tab.url)
                  };
                } catch (renderError) {
                  // Если не удалось разрешить переменные, используем исходный URL
                  console.warn('Failed to render URL for request:', tab.id, renderError);
                  return {
                    ...tab,
                    realUrl: request.url || tab.url
                  };
                }
              }
              return {
                ...tab,
                realUrl: request?.url || tab.url
              };
            } catch (e) {
              console.warn('Failed to load request:', tab.id, e);
              return { ...tab, realUrl: tab.url };
            }
          }
          return { ...tab, realUrl: tab.url };
        })
      );
      
      console.log('Enhanced tabs loaded:', enhanced.map(t => ({ name: t.name, realUrl: t.realUrl })));
      setEnhancedTabsState(enhanced);
    };
    
    loadRequestUrls();
  }, [tabList, workspaceData?.activeEnvironment]);

  // Filter tabs by search query
  const filteredTabs = useMemo(() => {
    if (!enhancedTabsState.length) return [];
    if (!searchQuery.trim()) return enhancedTabsState;
    
    const query = searchQuery.toLowerCase();
    return enhancedTabsState.filter(tab => 
      tab.name.toLowerCase().includes(query) ||
      tab.method?.toLowerCase().includes(query) ||
      (tab.realUrl || tab.url).toLowerCase().includes(query)
    );
  }, [enhancedTabsState, searchQuery]);

  // Helper functions for intelligent grouping
  const extractDomain = (url: string): string => {
    try {
      const cleanUrl = url.startsWith('http') ? url : `http://${url}`;
      return new URL(cleanUrl).hostname.replace('www.', '');
    } catch {
      return 'localhost';
    }
  };

  const extractEndpoint = (tab: EnhancedTab): string => {
    const url = tab.realUrl || tab.url;
    
    try {
      // Если URL содержит хост:порт/путь (наш случай)
      if (url.includes(':') && url.includes('/')) {
        const parts = url.split('/');
        // Берем все части после хоста:порта
        const pathParts = parts.slice(1); // убираем хост:порт
        return pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';
      }
      
      // Если это полный URL
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        return extractPathEndpoint(urlObj.pathname);
      }
      
      // Если это относительный путь
      if (url.startsWith('/')) {
        return extractPathEndpoint(url);
      }
      
      // Fallback - группируем по имени
      return tab.name.toLowerCase().split(/[\s_-]+/)[0] || 'other';
    } catch {
      return tab.name.toLowerCase().split(/[\s_-]+/)[0] || 'other';
    }
  };

  const extractPathEndpoint = (pathname: string): string => {
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    
    // Удаляем только очевидные ID
    const cleanParts = pathParts.filter((part) => {
      // Числовые ID
      if (/^\d+$/.test(part)) return false;
      // UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) return false;
      // Длинные хэши (больше 20 символов)
      if (part.length > 20 && /^[a-zA-Z0-9]+$/.test(part)) return false;
      return true;
    });
    
    return cleanParts.length > 0 ? `/${cleanParts.join('/')}` : '/';
  };

  const categorizeTab = (tab: BaseTab): string => {
    const name = tab.name.toLowerCase();
    const url = tab.url.toLowerCase();
    const method = tab.method?.toLowerCase() || '';

    if (name.includes('auth') || name.includes('login') || name.includes('token') || url.includes('auth')) {
      return 'auth';
    }
    if (name.includes('user') || url.includes('user') || url.includes('profile')) {
      return 'users';
    }
    if (name.includes('admin') || url.includes('admin')) {
      return 'admin';
    }
    if (method === 'get' && (url.includes('list') || url.includes('search') || url.includes('find'))) {
      return 'data-retrieval';
    }
    if (method === 'post' || method === 'put' || method === 'patch') {
      return 'data-modification';
    }
    if (method === 'delete') {
      return 'data-deletion';
    }
    if (url.includes('api')) {
      return 'api';
    }
    return 'general';
  };

  // Group tabs intelligently
  const groupedTabs = useMemo((): TabGroup[] => {
    const pinnedTabs = filteredTabs.filter(tab => tab.pinned);
    const unpinnedTabs = filteredTabs.filter(tab => !tab.pinned);

         // Group by endpoints (приоритет)
     const endpointGroups = unpinnedTabs.reduce((acc, tab) => {
       const endpoint = extractEndpoint(tab);
       // Группируем только по эндпоинту, игнорируя домен
       const fullKey = endpoint;
       
       console.log(`Tab "${tab.name}": realUrl="${tab.realUrl}" → endpoint="${endpoint}" → fullKey="${fullKey}"`);
       
       if (!acc[fullKey]) {
         acc[fullKey] = {
           endpoint,
           domain: '', // не используем домен для группировки
           tabs: []
         };
       }
       acc[fullKey].tabs.push(tab);
       return acc;
     }, {} as Record<string, { endpoint: string; domain: string; tabs: EnhancedTab[] }>);

    const groups: TabGroup[] = [];

    // 1. Pinned tabs
    if (pinnedTabs.length > 0) {
      groups.push({
        key: 'pinned',
        title: `📌 Закрепленные (${pinnedTabs.length})`,
        tabs: pinnedTabs.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // 2. Group by endpoints
    const endpointEntries = Object.entries(endpointGroups)
      .sort(([_, a], [__, b]) => {
        // Сначала по количеству табов (больше = выше)
        if (a.tabs.length !== b.tabs.length) {
          return b.tabs.length - a.tabs.length;
        }
        // Потом по последнему использованию
        const aLastUsed = Math.max(...a.tabs.map(t => t.lastUsed || 0));
        const bLastUsed = Math.max(...b.tabs.map(t => t.lastUsed || 0));
        return bLastUsed - aLastUsed;
      });

    endpointEntries.forEach(([key, { endpoint, domain, tabs }]) => {
      // Создаем понятное название группы
      let groupTitle = '';
      const methodCounts = tabs.reduce((acc, tab) => {
        const method = tab.method || 'GET';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const methodsStr = Object.entries(methodCounts)
        .map(([method, count]) => count > 1 ? `${method}(${count})` : method)
        .join(', ');

             if (endpoint === '/') {
         groupTitle = `🏠 Корень (${tabs.length})`;
       } else {
         groupTitle = `🔗 ${endpoint} (${tabs.length})`;
       }

      groups.push({
        key: `endpoint-${key}`,
        title: groupTitle,
        tabs: tabs.sort((a, b) => {
          // Сортируем по методу, потом по имени
          if (a.method !== b.method) {
            const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
            const aIndex = methodOrder.indexOf(a.method || 'GET');
            const bIndex = methodOrder.indexOf(b.method || 'GET');
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
          }
          return a.name.localeCompare(b.name);
        }),
      });
    });

    return groups;
  }, [filteredTabs]);

  const togglePin = (tabId: string) => {
    const tab = enhancedTabsState.find((t: EnhancedTab) => t.id === tabId);
    if (tab) {
      updateTabById?.(tabId, { pinned: !tab.pinned });
    }
  };

  const updateLastUsed = (tabId: string) => {
    updateTabById?.(tabId, { lastUsed: Date.now() });
    changeActiveTab(tabId);
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Если нет табов, не показываем компонент (после всех хуков)
  if (!tabList || tabList.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="flex h-[40px] items-center border-b border-solid border-[--hl-md] bg-[--color-bg]">
        <Button
          onPress={() => setIsCollapsed(false)}
          className="flex h-full items-center gap-2 px-4 hover:bg-[--hl-xs]"
        >
          <Icon icon={'chevron-right' as any} />
          <span className="text-sm">Показать табы ({tabList.length})</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="border-b border-solid border-[--hl-md] bg-[--color-bg]">
      {/* Search and Controls */}
      <div className="flex h-[40px] items-center gap-2 px-4 border-b border-solid border-[--hl-xs]">
        <div className="flex flex-1 items-center gap-2">
          <Icon icon={'search' as any} className="text-[--hl]" />
          <input
            placeholder="Поиск по табам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[--color-font]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--hl]">{filteredTabs.length} табов</span>
          <Button
            onPress={() => setIsCollapsed(true)}
            className="flex h-6 w-6 items-center justify-center hover:bg-[--hl-xs] rounded"
          >
            <Icon icon={'chevron-down' as any} className="text-xs" />
          </Button>
        </div>
      </div>

      {/* Grouped Tabs */}
      <div className="max-h-[400px] overflow-y-auto">
        {groupedTabs.map(group => {
          const isGroupCollapsed = collapsedGroups.has(group.key);
          return (
            <div key={group.key} className="border-b border-solid border-[--hl-xs] last:border-b-0">
              <Button
                onPress={() => toggleGroupCollapse(group.key)}
                className="flex h-[32px] w-full items-center gap-2 px-4 bg-[--hl-xs] text-sm font-medium hover:bg-[--hl-sm] transition-colors cursor-pointer"
              >
                <Icon 
                  icon={isGroupCollapsed ? 'chevron-right' : 'chevron-down'} 
                  className="w-3 h-3 text-[--hl] transition-transform duration-150" 
                />
                <span className="flex-1 text-left">{group.title}</span>
              </Button>
              {!isGroupCollapsed && (
                <div className="transition-all duration-150">
                  {group.tabs.map((tab) => {
                    const isActive = activeTabId === tab.id;
                    return (
                      <div 
                        key={tab.id} 
                        className={`flex items-center cursor-pointer transition-all duration-150 ${
                          isActive 
                            ? 'bg-[--hl-sm] border-l-4 border-[--color-surprise] shadow-sm' 
                            : 'hover:bg-[--hl-xs] border-l-4 border-transparent'
                        }`}
                        onClick={() => updateLastUsed(tab.id)}
                      >
                        <div className="flex-1">
                          <SimpleTab tab={tab} isActive={isActive} onTogglePin={togglePin} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}; 
