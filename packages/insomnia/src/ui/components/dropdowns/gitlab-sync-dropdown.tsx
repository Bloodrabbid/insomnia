/**
 * GitLabSyncDropdown — кнопка GitLab в верхней панели sidebar.
 * Открывает dropdown меню с пунктами Setup / Pull / Push.
 */
import { type FC, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components';

import { SvgIcnGitlabLogo } from '~/ui/components/assets/svgr/IcnGitlabLogo';
import { Icon } from '~/ui/components/icon';
import { GitLabSetupModal } from '~/ui/components/modals/gitlab-sync/gitlab-setup-modal';
import { GitLabPushModal } from '~/ui/components/modals/gitlab-sync/gitlab-push-modal';
import { GitLabPullModal } from '~/ui/components/modals/gitlab-sync/gitlab-pull-modal';

export const GitLabSyncDropdown: FC = () => {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPushOpen, setIsPushOpen] = useState(false);
  const [isPullOpen, setIsPullOpen] = useState(false);

  return (
    <>
      <MenuTrigger>
        <Button
          aria-label="GitLab Sync"
          data-testid="gitlab-sync-dropdown"
          className="flex h-7 items-center gap-1.5 rounded-xs px-2 py-1 text-sm text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset aria-pressed:bg-(--hl-sm)"
        >
          <SvgIcnGitlabLogo className="h-3.5 w-3.5 fill-current" />
          <span className="hidden sm:inline">GitLab</span>
          <Icon icon="caret-down" className="text-[10px]" />
        </Button>
        <Popover className="flex min-w-max flex-col overflow-y-hidden">
          <Menu
            aria-label="GitLab Sync actions"
            selectionMode="single"
            onAction={key => {
              if (key === 'setup') setIsSetupOpen(true);
              if (key === 'pull') setIsPullOpen(true);
              if (key === 'push') setIsPushOpen(true);
            }}
            className="min-w-max overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) py-2 text-sm shadow-lg select-none focus:outline-hidden"
          >
            <MenuItem
              id="setup"
              className="flex h-(--line-height-xs) w-full items-center gap-2 bg-transparent px-(--padding-md) whitespace-nowrap text-(--color-font) transition-colors hover:bg-(--hl-sm) focus:bg-(--hl-xs) focus:outline-hidden"
              aria-label="Setup"
            >
              <Icon icon="cog" className="w-4 text-(--hl)" />
              <span>Настройки</span>
            </MenuItem>
            <Separator className="my-1 h-px bg-(--hl-sm)" />
            <MenuItem
              id="pull"
              className="flex h-(--line-height-xs) w-full items-center gap-2 bg-transparent px-(--padding-md) whitespace-nowrap text-(--color-font) transition-colors hover:bg-(--hl-sm) focus:bg-(--hl-xs) focus:outline-hidden"
              aria-label="Pull Workspace"
            >
              <Icon icon="download" className="w-4 text-(--color-success)" />
              <span>Pull Workspace</span>
            </MenuItem>
            <MenuItem
              id="push"
              className="flex h-(--line-height-xs) w-full items-center gap-2 bg-transparent px-(--padding-md) whitespace-nowrap text-(--color-font) transition-colors hover:bg-(--hl-sm) focus:bg-(--hl-xs) focus:outline-hidden"
              aria-label="Push Workspace"
            >
              <Icon icon="upload" className="w-4 text-(--color-surprise)" />
              <span>Push Workspace</span>
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>

      {isSetupOpen && <GitLabSetupModal onClose={() => setIsSetupOpen(false)} />}
      {isPushOpen && <GitLabPushModal onClose={() => setIsPushOpen(false)} />}
      {isPullOpen && <GitLabPullModal onClose={() => setIsPullOpen(false)} />}
    </>
  );
};
