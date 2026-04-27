import React, { useCallback, useMemo, useRef } from 'react';
import { Button, Dialog, DialogTrigger, ListBox, ListBoxItem, Popover, Text } from 'react-aria-components';
import { useParams } from 'react-router';

import { useSetActiveEnvironmentFetcher } from '~/routes/organization.$organizationId.project.$projectId.workspace.$workspaceId.environment.set-active';

import { useWorkspaceLoaderData } from '../../routes/organization.$organizationId.project.$projectId.workspace.$workspaceId';
import uiEventBus from '../event-bus';
import { Icon } from './icon';

export const QuickEnvironmentSwitcher = () => {
  const workspaceData = useWorkspaceLoaderData();
  const { organizationId, projectId, workspaceId } = useParams() as {
    organizationId: string;
    projectId: string;
    workspaceId: string;
  };

  const setActiveEnvironmentFetcher = useSetActiveEnvironmentFetcher();
  const containerRef = useRef<HTMLDivElement>(null);

  const baseEnvironment = workspaceData?.baseEnvironment;
  const subEnvironments = useMemo(() => workspaceData?.subEnvironments || [], [workspaceData?.subEnvironments]);
  const activeEnvironment = workspaceData?.activeEnvironment;

  // All environments: base + subs
  const allEnvironments = useMemo(
    () => (baseEnvironment ? [baseEnvironment, ...subEnvironments] : []),
    [baseEnvironment, subEnvironments],
  );

  const switchToEnvironment = useCallback(
    (environmentId: string) => {
      if (!organizationId || !projectId || !workspaceId) return;
      setActiveEnvironmentFetcher.submit({
        organizationId,
        projectId,
        workspaceId,
        environmentId,
      });
      uiEventBus.emit('CHANGE_ACTIVE_ENV', workspaceId);
    },
    [organizationId, projectId, workspaceId, setActiveEnvironmentFetcher],
  );

  // Scroll wheel handler: cycle through environments
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (allEnvironments.length <= 1) return;
      e.preventDefault();
      e.stopPropagation();

      const currentIndex = allEnvironments.findIndex(env => env._id === activeEnvironment?._id);
      if (currentIndex === -1) return;

      const nextIndex = e.deltaY > 0
        ? (currentIndex + 1) % allEnvironments.length
        : (currentIndex - 1 + allEnvironments.length) % allEnvironments.length;

      switchToEnvironment(allEnvironments[nextIndex]._id);
    },
    [allEnvironments, activeEnvironment, switchToEnvironment],
  );


  // Don't render if no workspace is active
  if (!workspaceData || !baseEnvironment || !activeEnvironment) {
    return null;
  }

  const activeSubEnvironment = subEnvironments.find(e => e._id === activeEnvironment._id);
  const displayName = activeSubEnvironment?.name || 'Base';
  const displayColor = activeEnvironment.color || 'var(--color-font)';

  return (
    <div ref={containerRef} onWheel={handleWheel}>
      <DialogTrigger>
        <Button
          aria-label="Quick Environment Switcher"
          className="flex items-center gap-2 rounded-sm border border-solid border-(--hl-md) px-3 py-1 text-xs font-medium text-(--color-font) transition-all hover:bg-(--hl-xs) focus:outline-hidden"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: displayColor }}
          />
          <span className="max-w-[120px] truncate">{displayName}</span>
          <Icon icon="caret-down" className="text-[10px] opacity-60" />
        </Button>
        <Popover
          placement="bottom start"
          offset={4}
          className="z-10! min-w-[180px] overflow-hidden rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) shadow-lg"
        >
          <Dialog className="flex flex-col p-1 focus:outline-hidden">
            <ListBox
              aria-label="Select Environment"
              selectionMode="single"
              disallowEmptySelection
              items={allEnvironments.map(env => ({
                id: env._id,
                name: env._id === baseEnvironment._id ? 'Base Environment' : env.name,
                color: env.color,
                isBase: env._id === baseEnvironment._id,
              }))}
              selectedKeys={[activeEnvironment._id]}
              onSelectionChange={keys => {
                if (keys === 'all' || !keys) return;
                const [environmentId] = keys.values();
                switchToEnvironment(environmentId.toString());
              }}
              className="flex flex-col text-sm focus:outline-hidden"
            >
              {item => (
                <ListBoxItem
                  textValue={item.name}
                  className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-(--color-font) transition-colors hover:bg-(--hl-xs) focus:bg-(--hl-xs) focus:outline-hidden aria-selected:bg-(--hl-sm) aria-selected:font-semibold"
                >
                  {({ isSelected }) => (
                    <>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color || 'var(--color-font)' }}
                      />
                      <Text slot="label" className="flex-1 truncate text-xs">
                        {item.name}
                      </Text>
                      {isSelected && <Icon icon="check" className="text-xs text-(--color-success)" />}
                    </>
                  )}
                </ListBoxItem>
              )}
            </ListBox>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  );
};
