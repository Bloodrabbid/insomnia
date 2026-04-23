import React from 'react';
import { Button } from 'react-aria-components';
import * as reactUse from 'react-use';

import { Icon } from './icon';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  id: string;
  className?: string;
}

export const SidebarSection = ({ title, children, id, className = '' }: SidebarSectionProps) => {
  const [isOpen, setIsOpen] = reactUse.useLocalStorage(`sidebar-section-open:${id}`, true);

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <Button
        onPress={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 w-full hover:bg-(--hl-xs) transition-colors text-(--hl) text-[10px] font-bold uppercase select-none border-b border-solid border-(--hl-md)"
      >
        <Icon icon={isOpen ? 'chevron-down' : 'chevron-right'} className="w-3" />
        {title}
      </Button>
      {isOpen && (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </div>
  );
};
