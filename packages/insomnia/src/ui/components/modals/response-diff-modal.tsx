import React, { useEffect, useState } from 'react';
import { Modal, type ModalHandle } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalHeader } from '../base/modal-header';
import { DiffEditor } from '../diff-view-editor';
import { readCurlResponse, type Response } from '../../../models/response';

interface Props {
  activeResponse: Response;
  historyResponse: Response;
  onHide: () => void;
}

export const ResponseDiffModal = ({ activeResponse, historyResponse, onHide }: Props) => {
  const modalRef = React.useRef<ModalHandle>(null);
  const [original, setOriginal] = useState<string>('Loading...');
  const [modified, setModified] = useState<string>('Loading...');

  useEffect(() => {
    modalRef.current?.show();
    
    const loadBodies = async () => {
      try {
        const origBody = await readCurlResponse({ 
          bodyPath: historyResponse.bodyPath, 
          bodyCompression: historyResponse.bodyCompression 
        });
        const modBody = await readCurlResponse({ 
          bodyPath: activeResponse.bodyPath, 
          bodyCompression: activeResponse.bodyCompression 
        });
        
        setOriginal(origBody.body);
        setModified(modBody.body);
      } catch (err) {
        setOriginal('Error loading body');
        setModified('Error loading body');
      }
    };
    
    loadBodies();
  }, [activeResponse, historyResponse]);

  return (
    <Modal ref={modalRef} tall onHide={onHide}>
      <ModalHeader>
        Compare Responses: {historyResponse.statusCode} vs {activeResponse.statusCode}
      </ModalHeader>
      <ModalBody className="h-[70vh] pad">
        <div className="h-full w-full border border-solid border-[--hl-sm] rounded">
          <DiffEditor original={original} modified={modified} />
        </div>
      </ModalBody>
    </Modal>
  );
};
