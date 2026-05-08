/**
 * GitLab Sync — утилиты.
 * Парсинг V5 коллекции в дерево, фильтрация по выбранным элементам.
 */

import * as models from '~/models';

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'request' | 'grpc' | 'websocket' | 'socketio';
  method?: string;
  children?: TreeNode[];
}

/**
 * Парсит V5 collection в дерево для TreeSelector.
 * V5 collection — это массив items, где каждый item может иметь children (папки)
 * или method/url (запросы).
 */
export function parseCollectionToTree(collection: any[]): TreeNode[] {
  if (!Array.isArray(collection)) {
    return [];
  }

  return collection.map(item => {
    const id = item.meta?.id || `node_${Math.random().toString(36).slice(2)}`;

    // Определяем тип элемента
    if (item.children && Array.isArray(item.children)) {
      // Это папка (RequestGroup)
      return {
        id,
        name: item.name || 'Unnamed Folder',
        type: 'folder' as const,
        children: parseCollectionToTree(item.children),
      };
    }

    if (item.reflectionApi !== undefined) {
      return {
        id,
        name: item.name || 'gRPC Request',
        type: 'grpc' as const,
        method: 'gRPC',
      };
    }

    if (item.method) {
      return {
        id,
        name: item.name || 'Unnamed Request',
        type: 'request' as const,
        method: item.method,
      };
    }

    // WebSocket или Socket.IO (имеют url, но нет method)
    if (item.url && !item.method) {
      if (item.eventListeners) {
        return {
          id,
          name: item.name || 'Socket.IO Request',
          type: 'socketio' as const,
          method: 'IO',
        };
      }
      return {
        id,
        name: item.name || 'WebSocket Request',
        type: 'websocket' as const,
        method: 'WS',
      };
    }

    // Неизвестный тип — считаем папкой
    return {
      id,
      name: item.name || 'Unknown',
      type: 'folder' as const,
      children: [],
    };
  });
}

/**
 * Рекурсивно собирает все ID из дерева.
 */
export function collectAllIds(nodes: TreeNode[]): Set<string> {
  const ids = new Set<string>();

  function walk(items: TreeNode[]) {
    for (const item of items) {
      ids.add(item.id);
      if (item.children) {
        walk(item.children);
      }
    }
  }

  walk(nodes);
  return ids;
}

/**
 * Сопоставляет элементы коллекции по имени и типу с существующими в базе данных.
 * Если найдено совпадение по имени на том же уровне — подменяет ID в коллекции на существующий.
 */
export async function matchAndReplaceIds(
  collection: any[],
  existingResources: any[],
  parentId: string
) {
  for (const item of collection) {
    const isFolder = !!item.children;
    const type = isFolder ? models.requestGroup.type : models.request.type;
    const itemName = (item.name || '').trim().toLowerCase();
    
    // Ищем существующий элемент
    const match = existingResources.find(r => 
      (r.name || '').trim().toLowerCase() === itemName && 
      r.type === type && 
      r.parentId === parentId
    );

    if (match) {
      console.log(`GitLab Sync: Matched "${item.name}" -> existing ID ${match._id}`);
      if (item.meta) {
        item.meta.id = match._id;
      } else {
        item.meta = { id: match._id };
      }
    } else {
      console.log(`GitLab Sync: No match for "${item.name}" (type: ${type}) under parent ${parentId}`);
    }

    // Рекурсия
    if (item.children) {
      const currentId = match ? match._id : (item.meta?.id || parentId);
      await matchAndReplaceIds(item.children, existingResources, currentId);
    }
  }
}

/**
 * Рекурсивно фильтрует V5 collection, оставляя только элементы с ID из selectedIds.
 * Папки сохраняются если хотя бы один потомок выбран.
 */
export function filterV5Collection(collection: any[], selectedIds: Set<string>): any[] {
  return collection
    .map(item => {
      const id = item.meta?.id;

      if (item.children && Array.isArray(item.children)) {
        // Это папка — фильтруем потомков рекурсивно
        const filteredChildren = filterV5Collection(item.children, selectedIds);
        // Папка сохраняется если:
        // 1. Она сама выбрана, ИЛИ
        // 2. Хотя бы один потомок остался после фильтрации
        if (filteredChildren.length > 0 || selectedIds.has(id)) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }

      // Это запрос — оставляем только если выбран
      return selectedIds.has(id) ? item : null;
    })
    .filter(Boolean);
}

/**
 * Подсчитывает количество запросов (не папок) в поддереве.
 */
export function countRequests(node: TreeNode): number {
  if (!node.children) {
    return 1; // Сам является запросом
  }
  return node.children.reduce((sum, child) => sum + countRequests(child), 0);
}
