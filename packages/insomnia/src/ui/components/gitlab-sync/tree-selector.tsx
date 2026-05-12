/**
 * TreeSelector — компонент дерева с чекбоксами.
 * Используется в Push/Pull модалках для выбора отдельных папок/запросов.
 */
import { type FC, useCallback, useMemo, useState } from 'react';
import { Button, Checkbox } from 'react-aria-components';

import { Icon } from '~/ui/components/icon';
import { type TreeNode, collectAllIds, countRequests } from '~/ui/services/gitlab-sync-utils';

/** Цвета HTTP-методов — из debug route */
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-[rgba(var(--color-surprise-rgb),0.5)] text-(--color-font-surprise)',
  POST: 'bg-[rgba(var(--color-success-rgb),0.5)] text-(--color-font-success)',
  HEAD: 'bg-[rgba(var(--color-info-rgb),0.5)] text-(--color-font-info)',
  OPTIONS: 'bg-[rgba(var(--color-info-rgb),0.5)] text-(--color-font-info)',
  DELETE: 'bg-[rgba(var(--color-danger-rgb),0.5)] text-(--color-font-danger)',
  PUT: 'bg-[rgba(var(--color-warning-rgb),0.5)] text-(--color-font-warning)',
  PATCH: 'bg-[rgba(var(--color-notice-rgb),0.5)] text-(--color-font-notice)',
  gRPC: 'bg-[rgba(var(--color-info-rgb),0.5)] text-(--color-font-info)',
  WS: 'bg-[rgba(var(--color-notice-rgb),0.5)] text-(--color-font-notice)',
  IO: 'bg-[rgba(var(--color-notice-rgb),0.5)] text-(--color-font-notice)',
};

interface TreeSelectorProps {
  data: TreeNode[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

/** Собирает все ID потомков узла (включая сам узел) */
function collectDescendantIds(node: TreeNode): string[] {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectDescendantIds(child));
    }
  }
  return ids;
}

/** Определяет, все ли потомки узла выбраны */
function areAllDescendantsSelected(node: TreeNode, selected: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return selected.has(node.id);
  }
  return node.children.every(c => areAllDescendantsSelected(c, selected));
}

/** Определяет, есть ли хотя бы один выбранный потомок */
function hasAnyDescendantSelected(node: TreeNode, selected: Set<string>): boolean {
  if (selected.has(node.id)) return true;
  if (!node.children) return false;
  return node.children.some(c => hasAnyDescendantSelected(c, selected));
}

const TreeItem: FC<{
  node: TreeNode;
  level: number;
  selectedIds: Set<string>;
  onToggle: (node: TreeNode) => void;
}> = ({ node, level, selectedIds, onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isFolder = node.type === 'folder';
  const isSelected = isFolder
    ? areAllDescendantsSelected(node, selectedIds)
    : selectedIds.has(node.id);
  const isIndeterminate = isFolder && !isSelected && hasAnyDescendantSelected(node, selectedIds);

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-0.5 transition-colors hover:bg-(--hl-xs)"
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        {/* Чекбокс */}
        <Checkbox
          isSelected={isSelected}
          isIndeterminate={isIndeterminate}
          onChange={() => onToggle(node)}
          className="flex shrink-0 items-center"
        >
          <div
            className={`flex h-4 w-4 items-center justify-center rounded border border-solid transition-colors ${
              isSelected || isIndeterminate
                ? 'border-(--color-surprise) bg-(--color-surprise) text-white'
                : 'border-(--hl-md) bg-(--color-bg)'
            }`}
          >
            {isSelected && <Icon icon="check" className="text-[10px]" />}
            {isIndeterminate && <Icon icon="minus" className="text-[10px]" />}
          </div>
        </Checkbox>

        {/* Иконка папки / метод / окружение */}
        {isFolder ? (
          <button
            className="flex items-center gap-1 bg-transparent text-(--color-font) outline-hidden"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon icon={collapsed ? 'folder' : 'folder-open'} className="w-4 shrink-0 text-(--hl)" />
          </button>
        ) : node.type === 'env' ? (
          <div className="flex w-8 shrink-0 items-center justify-center rounded-xs border border-solid border-(--hl-sm) bg-(--hl-xs) text-(--hl)">
            <Icon icon="code" className="text-[10px]" />
          </div>
        ) : node.type === 'env-var' ? (
          <span className="flex w-8 shrink-0 items-center justify-center rounded-xs text-[0.6rem] bg-[rgba(var(--color-info-rgb),0.3)] text-(--color-font-info)">
            VAR
          </span>
        ) : (
          <span
            className={`flex w-8 shrink-0 items-center justify-center rounded-xs border border-solid border-(--hl-sm) text-[0.6rem] ${
              METHOD_COLORS[node.method || ''] || 'bg-(--hl-md) text-(--color-font)'
            }`}
          >
            {node.method || '?'}
          </span>
        )}

        {/* Название */}
        <button
          className="flex-1 cursor-pointer truncate bg-transparent text-left text-sm text-(--color-font) outline-hidden"
          onClick={() => isFolder ? setCollapsed(!collapsed) : onToggle(node)}
          title={node.name}
        >
          {node.name}
          {isFolder && node.children && (
            <span className="ml-1 text-xs text-(--hl)">
              ({countRequests(node)})
            </span>
          )}
        </button>

        {/* Стрелка для папок */}
        {isFolder && (
          <button
            className="flex h-5 w-5 items-center justify-center bg-transparent text-(--hl) outline-hidden transition-colors hover:text-(--color-font)"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon icon={collapsed ? 'chevron-right' : 'chevron-down'} className="text-xs" />
          </button>
        )}
      </div>

      {/* Потомки */}
      {isFolder && !collapsed && node.children && (
        <div>
          {node.children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeSelector: FC<TreeSelectorProps> = ({ data, selectedIds, onSelectionChange }) => {
  const allIds = useMemo(() => collectAllIds(data), [data]);

  const handleToggle = useCallback(
    (node: TreeNode) => {
      const next = new Set(selectedIds);
      const descendantIds = collectDescendantIds(node);

      if (node.type === 'folder') {
        const allSelected = areAllDescendantsSelected(node, selectedIds);
        if (allSelected) {
          // Снимаем все потомков
          for (const id of descendantIds) {
            next.delete(id);
          }
        } else {
          // Выбираем все потомки
          for (const id of descendantIds) {
            next.add(id);
          }
        }
      } else {
        // Одиночный запрос — toggle
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
      }

      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const selectAll = useCallback(() => {
    onSelectionChange(new Set(allIds));
  }, [allIds, onSelectionChange]);

  const selectNone = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 pb-1">
        <Button
          className="rounded-xs px-2 py-0.5 text-xs text-(--color-font) ring-1 ring-(--hl-md) transition-colors hover:bg-(--hl-xs)"
          onPress={selectAll}
        >
          Выбрать все
        </Button>
        <Button
          className="rounded-xs px-2 py-0.5 text-xs text-(--color-font) ring-1 ring-(--hl-md) transition-colors hover:bg-(--hl-xs)"
          onPress={selectNone}
        >
          Снять все
        </Button>
        <span className="ml-auto text-xs text-(--hl)">
          {selectedIds.size} / {allIds.size}
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) py-1">
        {data.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-(--hl)">
            Нет элементов для отображения
          </div>
        )}
        {data.map(node => (
          <TreeItem
            key={node.id}
            node={node}
            level={0}
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};
