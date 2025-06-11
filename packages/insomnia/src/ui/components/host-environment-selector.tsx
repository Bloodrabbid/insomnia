import React, { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Input,
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  Popover,
  TextField,
  Label,
  Form,
} from 'react-aria-components';
import { useFetcher, useParams, useRouteLoaderData } from 'react-router';

import type { WorkspaceLoaderData } from '../routes/workspace';
import { Icon } from './icon';

interface HostEnvironment {
  id: string;
  name: string;
  host: string;
  color: string;
  isActive: boolean;
}

export const HostEnvironmentSelector = () => {
  const { organizationId, projectId, workspaceId } = useParams() as {
    organizationId: string;
    projectId: string;
    workspaceId: string;
  };
  
  const { activeEnvironment } = useRouteLoaderData(':workspaceId') as WorkspaceLoaderData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostUrl, setNewHostUrl] = useState('');
  const [newHostColor, setNewHostColor] = useState('#3498db');
  const [editingValues, setEditingValues] = useState<Record<string, { name: string; host: string; color: string }>>({});

  const updateEnvironmentFetcher = useFetcher();

  // Извлекаем текущие хосты из переменных окружения
  const hostEnvironments = useMemo((): HostEnvironment[] => {
    const envData = activeEnvironment.data || {};
    const hosts: HostEnvironment[] = [];
    const activeHostId = envData['active_host'] as string;

    // Ищем хосты в переменных среды (host_env_name, host_env_url, host_env_color)
    Object.keys(envData).forEach(key => {
      if (key.startsWith('host_') && key.endsWith('_name')) {
        const envName = key.replace('host_', '').replace('_name', '');
        const name = envData[key] as string;
        const host = envData[`host_${envName}_url`] as string || '';
        const color = envData[`host_${envName}_color`] as string || '#3498db';
        const isActive = activeHostId === envName;
        
        hosts.push({
          id: envName,
          name,
          host,
          color,
          isActive,
        });
      }
    });

    // Сортируем: активные сверху, потом по алфавиту
    return hosts.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [activeEnvironment.data]);

  console.log('HostEnvironmentSelector:', { 
    isModalOpen, 
    hostCount: hostEnvironments.length,
    hostEnvironments 
  });

  const activeHost = hostEnvironments.find(h => h.isActive);

  const switchToHost = (hostEnv: HostEnvironment) => {
    const updates: Record<string, any> = {
      'active_host': hostEnv.id,
      'host': hostEnv.host, // основная переменная host для использования в запросах
    };

    updateEnvironmentFetcher.submit(
      {
        patch: {
          data: {
            ...activeEnvironment.data,
            ...updates,
          },
        },
        environmentId: activeEnvironment._id,
      },
      {
        method: 'post',
        action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment/update`,
        encType: 'application/json',
      }
    );
    console.log('Switched to host:', hostEnv.name);
  };

  const updateEditingValue = (hostId: string, field: 'name' | 'host' | 'color', value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [hostId]: {
        ...prev[hostId],
        [field]: value,
      },
    }));
  };

  const saveEditingHost = (hostId: string) => {
    const editingHost = editingValues[hostId];
    if (!editingHost) return;

    const updates: Record<string, any> = {
      [`host_${hostId}_name`]: editingHost.name,
      [`host_${hostId}_url`]: editingHost.host,
      [`host_${hostId}_color`]: editingHost.color,
    };

    // Если это активный хост, обновляем также основную переменную host
    const originalHost = hostEnvironments.find(h => h.id === hostId);
    if (originalHost?.isActive) {
      updates['host'] = editingHost.host;
    }

    updateEnvironmentFetcher.submit(
      {
        patch: {
          data: {
            ...activeEnvironment.data,
            ...updates,
          },
        },
        environmentId: activeEnvironment._id,
      },
      {
        method: 'post',
        action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment/update`,
        encType: 'application/json',
      }
    );
    console.log('Saved editing host:', editingHost);
  };

  const deleteHost = (hostId: string) => {
    const envData = { ...activeEnvironment.data };
    delete envData[`host_${hostId}_name`];
    delete envData[`host_${hostId}_url`];
    delete envData[`host_${hostId}_color`];
    
    // Если удаляем активный хост, переключаемся на первый доступный
    if (envData['active_host'] === hostId) {
      const remainingHosts = hostEnvironments.filter(h => h.id !== hostId);
      if (remainingHosts.length > 0) {
        envData['active_host'] = remainingHosts[0].id;
        envData['host'] = remainingHosts[0].host;
      } else {
        // Если хостов не осталось, очищаем активный хост
        delete envData['active_host'];
        delete envData['host'];
      }
    }

    updateEnvironmentFetcher.submit(
      {
        patch: { data: envData },
        environmentId: activeEnvironment._id,
      },
      {
        method: 'post',
        action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment/update`,
        encType: 'application/json',
      }
    );
    console.log('Deleted host:', hostId);
  };

  const initializeEditingValues = () => {
    const values: Record<string, { name: string; host: string; color: string }> = {};
    hostEnvironments.forEach(host => {
      values[host.id] = {
        name: host.name,
        host: host.host,
        color: host.color,
      };
    });
    setEditingValues(values);
  };

  const addNewHost = () => {
    console.log('addNewHost called with:', { newHostName, newHostUrl, newHostColor });
    
    if (!newHostName || !newHostUrl) {
      console.log('Validation failed: missing name or URL');
      return;
    }
    
    const hostId = newHostName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const updates: Record<string, any> = {
      [`host_${hostId}_name`]: newHostName,
      [`host_${hostId}_url`]: newHostUrl,
      [`host_${hostId}_color`]: newHostColor,
    };

    // Если это первый хост, делаем его активным
    if (hostEnvironments.length === 0) {
      updates['active_host'] = hostId;
      updates['host'] = newHostUrl;
    }

    updateEnvironmentFetcher.submit(
      {
        patch: {
          data: {
            ...activeEnvironment.data,
            ...updates,
          },
        },
        environmentId: activeEnvironment._id,
      },
      {
        method: 'post',
        action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment/update`,
        encType: 'application/json',
      }
    );
    
    setNewHostName('');
    setNewHostUrl('');
    setNewHostColor('#3498db');
    setIsModalOpen(false);
    console.log('New host saved and modal closed');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {hostEnvironments.length === 0 ? (
          <Button
            onPress={() => {
              console.log('Добавить хост button clicked - no hosts exist');
              setIsModalOpen(true);
              console.log('Modal set to open');
            }}
            className="flex items-center gap-2 rounded-sm px-3 py-1 text-sm text-[--hl] ring-1 ring-transparent transition-all hover:bg-[--hl-xs] focus:ring-inset focus:ring-[--hl-md]"
          >
            <div className="w-3 h-3 rounded-full bg-[--hl]" />
            <span>Добавить хост</span>
            <Icon icon="plus" className="w-3" />
          </Button>
        ) : (
          <DialogTrigger>
            <Button
              aria-label="Switch Host Environment"
              className="flex items-center gap-2 rounded-sm px-3 py-1 text-sm text-[--color-font] ring-1 ring-transparent transition-all hover:bg-[--hl-xs] focus:ring-inset focus:ring-[--hl-md] aria-pressed:bg-[--hl-sm]"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeHost?.color || '#6b7280' }}
              />
              <span className="font-medium">{activeHost?.name || 'Выберите хост'}</span>
              <Icon icon="caret-down" className="w-3" />
            </Button>
            <Popover className="min-w-[250px] max-h-[400px] overflow-y-auto rounded-md border border-solid border-[--hl-sm] bg-[--color-bg] shadow-lg">
              <div className="p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-[--hl]">Выберите среду</span>
                  <Button
                    onPress={() => {
                      initializeEditingValues();
                      setIsModalOpen(true);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-sm text-[--hl] hover:bg-[--hl-xs] hover:text-[--color-font]"
                    aria-label="Manage Hosts"
                  >
                    <Icon icon="gear" className="w-3" />
                  </Button>
                </div>
                
                <ListBox
                  aria-label="Host Environments"
                  items={hostEnvironments}
                  onAction={(key) => {
                    const host = hostEnvironments.find(h => h.id === key);
                    if (host && !host.isActive) {
                      switchToHost(host);
                    }
                  }}
                  className="space-y-1"
                >
                  {(host) => (
                    <ListBoxItem
                      key={host.id}
                      className={`flex items-center gap-3 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-[--hl-xs] ${
                        host.isActive ? 'bg-[--hl-sm] text-[--color-font]' : 'text-[--hl]'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: host.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{host.name}</div>
                        <div className="text-xs opacity-75 truncate">{host.host}</div>
                      </div>
                      {host.isActive && (
                        <Icon icon="check" className="w-4 text-[--color-success] flex-shrink-0" />
                      )}
                    </ListBoxItem>
                  )}
                </ListBox>
              </div>
            </Popover>
          </DialogTrigger>
        )}
      </div>

      <ModalOverlay 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <Modal className="max-w-lg w-full m-4 rounded-lg border border-solid border-[--hl-sm] bg-[--color-bg] shadow-xl">
          <Dialog className="outline-none">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-solid border-[--hl-sm]">
                <Heading className="text-lg font-bold">
                  {hostEnvironments.length === 0 ? 'Добавить хост' : 'Управление хостами'}
                </Heading>
                <Button
                  onPress={() => setIsModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-[--hl] hover:bg-[--hl-xs] hover:text-[--color-font]"
                >
                  <Icon icon="close" />
                </Button>
              </div>

              <div className="p-4">
                                 {/* Список существующих хостов */}
                 {hostEnvironments.length > 0 && (
                   <div className="space-y-3 mb-6">
                     <h3 className="text-sm font-bold text-[--hl]">Существующие хосты</h3>
                     {hostEnvironments.map((host) => (
                       <div key={host.id} className="flex items-center gap-3 p-3 border border-solid border-[--hl-sm] rounded-sm">
                         <input
                           type="color"
                           value={editingValues[host.id]?.color || host.color}
                           onChange={(e) => {
                             updateEditingValue(host.id, 'color', e.target.value);
                             saveEditingHost(host.id);
                           }}
                           className="w-6 h-6 rounded border-none cursor-pointer"
                         />
                         <div className="flex-1 grid grid-cols-2 gap-3">
                           <TextField>
                             <Label className="text-xs text-[--hl] mb-1">Название</Label>
                             <Input
                               value={editingValues[host.id]?.name || host.name}
                               onChange={(e) => {
                                 updateEditingValue(host.id, 'name', e.target.value);
                               }}
                               onBlur={() => {
                                 saveEditingHost(host.id);
                               }}
                               className="w-full px-2 py-1 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
                             />
                           </TextField>
                           <TextField>
                             <Label className="text-xs text-[--hl] mb-1">Хост</Label>
                             <Input
                               value={editingValues[host.id]?.host || host.host}
                               onChange={(e) => {
                                 updateEditingValue(host.id, 'host', e.target.value);
                               }}
                               onBlur={() => {
                                 saveEditingHost(host.id);
                               }}
                               className="w-full px-2 py-1 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
                             />
                           </TextField>
                         </div>
                         <div className="flex items-center gap-2">
                           <Button
                             onPress={() => switchToHost(host)}
                             className={`px-3 py-1 text-sm rounded ${
                               host.isActive 
                                 ? 'bg-[--color-success] text-white' 
                                 : 'border border-solid border-[--hl-sm] text-[--color-font] hover:bg-[--hl-xs]'
                             }`}
                           >
                             {host.isActive ? 'Активен' : 'Активировать'}
                           </Button>
                           <Button
                             onPress={() => deleteHost(host.id)}
                             className="p-1 text-[--color-danger] hover:bg-[--hl-xs] rounded"
                             aria-label="Delete Host"
                           >
                             <Icon icon="trash" className="w-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                {/* Форма добавления нового хоста */}
                <div className={hostEnvironments.length > 0 ? "border-t border-solid border-[--hl-sm] pt-4" : ""}>
                  <h3 className="text-sm font-bold text-[--hl] mb-3">
                    {hostEnvironments.length > 0 ? 'Добавить новый хост' : 'Создать первый хост'}
                  </h3>
                  <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addNewHost();
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-end gap-3">
                    <input
                      type="color"
                      value={newHostColor}
                      onChange={(e) => setNewHostColor(e.target.value)}
                      className="w-8 h-8 rounded border-none cursor-pointer"
                    />
                    <TextField className="flex-1">
                      <Label className="text-sm text-[--hl] mb-1">Название</Label>
                      <Input
                        value={newHostName}
                        onChange={(e) => setNewHostName(e.target.value)}
                        placeholder="Staging"
                        className="w-full px-3 py-2 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
                      />
                    </TextField>
                  </div>
                  
                  <TextField>
                    <Label className="text-sm text-[--hl] mb-1">Хост</Label>
                    <Input
                      value={newHostUrl}
                      onChange={(e) => setNewHostUrl(e.target.value)}
                      placeholder="staging.example.com:8080"
                      className="w-full px-3 py-2 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
                    />
                  </TextField>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      isDisabled={!newHostName.trim() || !newHostUrl.trim()}
                      className="px-4 py-2 bg-[--color-surprise] text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                      Добавить хост
                    </Button>
                    <Button
                      onPress={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-solid border-[--hl-sm] rounded hover:bg-[--hl-xs]"
                    >
                      Отмена
                                         </Button>
                   </div>
                 </Form>
                 </div>
               </div>

              <div className="p-4 border-t border-solid border-[--hl-sm] bg-[--hl-xxs]">
                <div className="text-sm text-[--hl]">
                  <strong>Как использовать:</strong> В ваших запросах используйте <code className="bg-[--hl-xs] px-1 rounded">{'{{host}}'}</code> вместо хоста. 
                  Например: <code className="bg-[--hl-xs] px-1 rounded">{'{{host}}/api/users'}</code>
                </div>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}; 
