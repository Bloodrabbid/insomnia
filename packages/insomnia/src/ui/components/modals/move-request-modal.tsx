import React, { useState } from 'react';
import { OverlayContainer } from 'react-aria';
import { useParams } from 'react-router';

import { database } from '../../../common/database';
import * as models from '../../../models';
import { useWorkspaceLoaderData } from '../../../routes/organization.$organizationId.project.$projectId.workspace.$workspaceId';
import { useRequestPatcher } from '../../hooks/use-request';
import { Modal, type ModalHandle, type ModalProps } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalFooter } from '../base/modal-footer';
import { ModalHeader } from '../base/modal-header';
import { Icon } from '../icon';

interface MoveRequestModalProps extends ModalProps {
  requestId: string;
  onHide: () => void;
}

export const MoveRequestModal = ({ requestId, onHide }: MoveRequestModalProps) => {
  const { activeWorkspace, collection } = useWorkspaceLoaderData()!;
  const { workspaceId } = useParams() as {
    workspaceId: string;
  };

  const [filter, setFilter] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const modalRef = React.useRef<ModalHandle>(null);
  React.useEffect(() => {
    modalRef.current?.show();
  }, []);

  const folders = collection.filter(item => models.requestGroup.isRequestGroup(item.doc));
  
  const filteredFolders = folders.filter(f => 
    f.doc.name.toLowerCase().includes(filter.toLowerCase())
  );

  const requestItem = collection.find(item => item.doc._id === requestId);

  React.useEffect(() => {
    if (requestItem) {
      setSelectedParentId(requestItem.doc.parentId);
    }
  }, [requestItem]);

  const patchRequest = useRequestPatcher();

  const handleMove = async () => {
    if (!requestItem) return;
    
    patchRequest(requestId, { parentId: selectedParentId });
    onHide();
  };

  return (
    <OverlayContainer onClick={e => e.stopPropagation()}>
      <Modal onHide={onHide} ref={modalRef}>
        <ModalHeader>Move Request to Folder</ModalHeader>
        <ModalBody className="wide pad">
          <div className="form-control form-control--outlined">
            <label>
              Search Folders
              <input
                type="text"
                placeholder="Filter folders..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                autoFocus
              />
            </label>
          </div>
          <div className="mt-4 max-h-[400px] overflow-y-auto border border-solid border-(--hl-sm) rounded-md bg-(--color-bg)">
            <div 
              className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-(--hl-xs) transition-colors ${selectedParentId === workspaceId ? 'bg-(--hl-sm) font-bold text-(--color-font)' : 'text-(--color-font)'}`}
              onClick={() => setSelectedParentId(workspaceId)}
            >
              <Icon icon="home" className="w-4 opacity-70" />
              <span>Root (Workspace)</span>
            </div>
            {filteredFolders.map(folder => (
              <div 
                key={folder.doc._id}
                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-(--hl-xs) transition-colors ${selectedParentId === folder.doc._id ? 'bg-(--hl-sm) font-bold text-(--color-font)' : 'text-(--color-font)'}`}
                style={{ paddingLeft: `${(folder.level + 1) * 16}px` }}
                onClick={() => setSelectedParentId(folder.doc._id)}
              >
                <Icon icon="folder" className="w-4 opacity-70" />
                <span className="truncate">{folder.doc.name}</span>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onHide}
              className="btn btn--no-background"
            >
              Cancel
            </button>
            <button 
              className="btn" 
              onClick={handleMove}
              disabled={!selectedParentId || (requestItem && selectedParentId === requestItem.doc.parentId)}
            >
              Move
            </button>
          </div>
        </ModalFooter>
      </Modal>
    </OverlayContainer>
  );
};
