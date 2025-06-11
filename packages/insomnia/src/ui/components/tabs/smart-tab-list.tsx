import React, { useMemo, useState } from 'react';
import { Button, Input } from 'react-aria-components';
import { Icon } from '../icon';
import type { BaseTab } from './tab';
import { InsomniaTab } from './tab';
import { useInsomniaTabContext } from '../../context/app/insomnia-tab-context';

interface TabGroup {
  key: string;
  title: string;
  icon: string;
  tabs: BaseTab[];
  color?: string;
}

interface SmartTabListProps {
  showActiveStatus?: boolean;
  currentPage?: string;
}

export const SmartTabList: React.FC<SmartTabListProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { currentOrgTabs, updateTabById, changeActiveTab } = useInsomniaTabContext();
  const { tabList, activeTabId } = currentOrgTabs;

  // Extract domain from URL
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname || 'local';
    } catch {
      return 'local';
    }
  };

  // Auto-categorize tabs
  const categorizeTab = (tab: BaseTab): string => {
    const url = tab.url.toLowerCase();
    if (url.includes('auth') || url.includes('login') || url.includes('token')) return 'Authentication';
    if (url.includes('user') || url.includes('profile') || url.includes('account')) return 'Users';
    if (url.includes('admin') || url.includes('management')) return 'Admin';
    if (url.includes('api/v')) return 'API';
    if (tab.method === 'GET') return 'Data Retrieval';
    if (tab.method === 'POST' || tab.method === 'PUT' || tab.method === 'PATCH') return 'Data Modification';
    if (tab.method === 'DELETE') return 'Data Deletion';
    return 'General';
  };

  // Enhanced tabs with metadata
  const enhancedTabs = useMemo(() => {
    return tabList.map(tab => ({
      ...tab,
      domain: tab.domain || extractDomain(tab.url),
      category: tab.category || categorizeTab(tab),
      lastUsed: tab.lastUsed || Date.now(),
    }));
  }, [tabList]);

  // Filter tabs by search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return enhancedTabs;
    
    const query = searchQuery.toLowerCase();
    return enhancedTabs.filter(tab => 
      tab.name.toLowerCase().includes(query) ||
      tab.method?.toLowerCase().includes(query) ||
      tab.domain.toLowerCase().includes(query) ||
      tab.category.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
    );
  }, [enhancedTabs, searchQuery]);

  // Group tabs intelligently
  const groupedTabs = useMemo((): TabGroup[] => {
    const pinnedTabs = filteredTabs.filter(tab => tab.pinned);
    const recentTabs = filteredTabs
      .filter(tab => !tab.pinned)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 5);
    
    const remainingTabs = filteredTabs.filter(tab => 
      !tab.pinned && !recentTabs.includes(tab)
    );

    // Group by domain
    const domainGroups: Record<string, BaseTab[]> = {};
    remainingTabs.forEach(tab => {
      const domain = tab.domain;
      if (!domainGroups[domain]) domainGroups[domain] = [];
      domainGroups[domain].push(tab);
    });

    // Group by category
    const categoryGroups: Record<string, BaseTab[]> = {};
    remainingTabs.forEach(tab => {
      const category = tab.category;
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(tab);
    });

    const groups: TabGroup[] = [];

    // Add pinned section
    if (pinnedTabs.length > 0) {
      groups.push({
        key: 'pinned',
        title: 'Закрепленные',
        icon: 'star',
        tabs: pinnedTabs,
        color: 'text-yellow-500'
      });
    }

    // Add recent section
    if (recentTabs.length > 0) {
      groups.push({
        key: 'recent',
        title: 'Недавние',
        icon: 'clock',
        tabs: recentTabs,
        color: 'text-blue-500'
      });
    }

    // Add domain groups (if more than 1 tab per domain)
    Object.entries(domainGroups)
      .filter(([_, tabs]) => tabs.length > 1)
      .forEach(([domain, tabs]) => {
        groups.push({
          key: `domain-${domain}`,
          title: domain,
          icon: 'globe',
          tabs: tabs.sort((a, b) => a.name.localeCompare(b.name)),
          color: 'text-green-500'
        });
      });

    // Add category groups
    Object.entries(categoryGroups)
      .filter(([_, tabs]) => tabs.length > 1)
      .forEach(([category, tabs]) => {
        groups.push({
          key: `category-${category}`,
          title: category,
          icon: 'folder',
          tabs: tabs.sort((a, b) => a.name.localeCompare(b.name)),
          color: 'text-purple-500'
        });
      });

    // Add ungrouped tabs
    const ungroupedTabs = remainingTabs.filter(tab => {
      const inDomainGroup = domainGroups[tab.domain]?.length > 1;
      const inCategoryGroup = categoryGroups[tab.category]?.length > 1;
      return !inDomainGroup && !inCategoryGroup;
    });

    if (ungroupedTabs.length > 0) {
      groups.push({
        key: 'other',
        title: 'Другие',
        icon: 'bars',
        tabs: ungroupedTabs.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return groups;
  }, [filteredTabs]);

  const togglePin = (tabId: string) => {
    const tab = enhancedTabs.find(t => t.id === tabId);
    if (tab) {
      updateTabById?.(tabId, { pinned: !tab.pinned });
    }
  };

  const updateLastUsed = (tabId: string) => {
    updateTabById?.(tabId, { lastUsed: Date.now() });
    changeActiveTab(tabId);
  };

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
          <Input
            placeholder="Поиск по табам..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
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
        {groupedTabs.map(group => (
          <div key={group.key} className="border-b border-solid border-[--hl-xs] last:border-b-0">
            <div className="flex h-[32px] items-center gap-2 px-4 bg-[--hl-xs] text-sm font-medium">
              <Icon icon={group.icon as any} className={group.color || 'text-[--hl]'} />
              <span>{group.title}</span>
              <span className="text-xs text-[--hl]">({group.tabs.length})</span>
            </div>
            <div className="focus:outline-none">
              {group.tabs.map((tab) => (
                <div key={tab.id} className="flex items-center hover:bg-[--hl-xs] cursor-pointer" onClick={() => updateLastUsed(tab.id)}>
                  <div className="flex-1">
                    <InsomniaTab tab={tab} />
                  </div>
                  <Button
                    onPress={() => togglePin(tab.id)}
                    className={`flex h-8 w-8 items-center justify-center hover:bg-[--hl-md] ${
                      tab.pinned ? 'text-yellow-500' : 'text-[--hl]'
                    }`}
                    aria-label={tab.pinned ? 'Открепить' : 'Закрепить'}
                  >
                    <Icon icon={'star' as any} className={tab.pinned ? '' : 'opacity-30'} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 
