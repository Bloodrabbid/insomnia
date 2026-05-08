/**
 * GitLab Pull Modal — скачивание workspace из GitLab с выбором элементов.
 */
import yaml from 'js-yaml';
import { type FC, useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
} from 'react-aria-components';
import { useParams } from 'react-router';

import { scanResources, importResourcesToWorkspace } from '~/common/import';
import { database as db } from '~/common/database';
import * as models from '~/models';
import { services } from '~/insomnia-data';
import { Icon } from '~/ui/components/icon';
import { TreeSelector } from '~/ui/components/gitlab-sync/tree-selector';
import { type GitLabSyncConfig, loadGitLabConfig } from '~/ui/services/gitlab-sync-config';
import { GitLabSyncService } from '~/ui/services/gitlab-sync';
import { type TreeNode, collectAllIds, filterV5Collection, parseCollectionToTree, matchAndReplaceIds } from '~/ui/services/gitlab-sync-utils';

interface GitLabPullModalProps {
  onClose: () => void;
}

export const GitLabPullModal: FC<GitLabPullModalProps> = ({ onClose }) => {
  const { workspaceId } = useParams() as { workspaceId: string };

  const [config, setConfig] = useState<GitLabSyncConfig | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [parsedV5, setParsedV5] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('merge');

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Загружаем конфиг + список веток
  useEffect(() => {
    (async () => {
      try {
        const cfg = await loadGitLabConfig();
        if (!cfg) {
          setError('GitLab Sync не настроен. Откройте Setup.');
          setLoading(false);
          return;
        }
        setConfig(cfg);
        setSelectedBranch(cfg.branch);
        setImportMode(cfg.clearBeforeImport ? 'overwrite' : 'merge');

        const service = new GitLabSyncService(cfg);
        const branchList = await service.fetchBranches().catch(() => [cfg.branch]);
        setBranches(branchList);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Загрузить содержимое файла из выбранной ветки
  const handleFetchRemote = useCallback(async () => {
    if (!config) return;
    setFetching(true);
    setError('');
    setTree([]);
    setSelectedIds(new Set());
    setParsedV5(null);

    try {
      const service = new GitLabSyncService(config);
      const content = await service.pullWorkspace(selectedBranch);

      // Парсим содержимое (YAML или JSON)
      let parsed: any;
      try {
        parsed = yaml.load(content);
      } catch (yamlError: any) {
        console.warn('GitLab Sync: Failed to parse as YAML, trying JSON', yamlError);
        try {
          parsed = JSON.parse(content);
        } catch (jsonError) {
          // Если и JSON не сработал, показываем ошибку YAML, так как файл .yaml
          throw new Error(`Ошибка в YAML файле: ${yamlError.message}`);
        }
      }

      setParsedV5(parsed);

      if (parsed?.collection) {
        const treeData = parseCollectionToTree(parsed.collection);
        setTree(treeData);
        setSelectedIds(collectAllIds(treeData));
      } else {
        setError('Файл не содержит collection.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }, [config, selectedBranch]);

  // 3. Pull — импорт выбранных элементов
  const handlePull = useCallback(async () => {
    if (!parsedV5 || !config) return;
    setPulling(true);
    setError('');
    setSuccess('');

    try {
      // Фильтруем коллекцию по выбранным элементам
      let dataToImport = parsedV5;
      const allIds = collectAllIds(tree);

      if (selectedIds.size < allIds.size) {
        const filteredCollection = filterV5Collection(parsedV5.collection || [], selectedIds);
        dataToImport = { ...parsedV5, collection: filteredCollection };
      }

      // Если режим слияния — пробуем сопоставить ID по именам, чтобы не плодить дубликаты папок
      if (importMode === 'merge') {
        const workspace = await services.workspace.getById(workspaceId);
        if (workspace) {
          const existingResources = await db.getWithDescendants(workspace);
          await matchAndReplaceIds(dataToImport.collection || [], existingResources, workspaceId);
        }
      }

      // Сериализуем обратно в YAML для импорта через scanResources
      const yaml = await import('js-yaml');
      const content = yaml.dump(dataToImport, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
      });

      // Режим перезаписи
      if (importMode === 'overwrite') {
        // Очищаем workspace: удаляем все запросы и папки
        const workspace = await services.workspace.getById(workspaceId);
        if (workspace) {
          const descendants = await db.getWithDescendants(workspace, [
            models.request.type,
            models.requestGroup.type,
            models.grpcRequest.type,
            models.webSocketRequest.type,
            models.socketIORequest.type,
          ]);

          const toRemove = descendants.filter(d => d._id !== workspaceId);
          const bufferId = await db.bufferChanges();
          for (const doc of toRemove) {
            await db.remove(doc);
          }
          await db.flushChanges(bufferId);
        }
      }

      // Импортируем напрямую в БД через upsert, чтобы сохранить сопоставленные ID
      const scanResult = await scanResources([{ contentStr: content }]);
      if (scanResult[0]?.errors?.length) {
        setError(scanResult[0].errors.join('\n'));
        return;
      }

      const resources = scanResult[0].resources || [];
      const bufferId = await db.bufferChanges();
      
      try {
        for (const resource of resources) {
          // Пропускаем сам воркспейс, чтобы не затереть его метаданные (имя и т.д.)
          if (models.workspace.isWorkspace(resource)) continue;
          
          // Привязываем к текущему воркспейсу, если это корневой элемент
          if (resource.parentId === '__WORKSPACE_ID__' || resource.parentId === parsedV5.meta?.id) {
            resource.parentId = workspaceId;
          }

          // Проверяем существование документа
          const existing = await db.findOne(resource.type, { _id: resource._id });
          if (existing) {
            await db.update(resource);
          } else {
            await db.insert(resource);
          }
        }
      } finally {
        await db.flushChanges(bufferId);
      }

      setSuccess('Импорт успешно завершён!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPulling(false);
    }
  }, [parsedV5, config, selectedIds, tree, importMode, workspaceId]);

  return (
    <ModalOverlay
      isOpen
      onOpenChange={isOpen => !isOpen && onClose()}
      isDismissable
      className="fixed top-0 left-0 z-10 flex h-(--visual-viewport-height) w-full items-center justify-center bg-black/30"
    >
      <Modal
        onOpenChange={isOpen => !isOpen && onClose()}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) p-(--padding-lg) text-(--color-font)"
      >
        <Dialog className="outline-hidden">
          {({ close }) => (
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <Heading className="flex items-center gap-2 text-lg font-semibold">
                  <Icon icon="download" className="text-(--color-success)" />
                  GitLab — Pull Workspace
                </Heading>
                <Button
                  className="flex aspect-square h-6 shrink-0 items-center justify-center rounded-xs text-sm text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset"
                  onPress={close}
                >
                  <Icon icon="x" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="spinner" className="animate-spin text-xl text-(--hl)" />
                  <span className="ml-2 text-sm text-(--hl)">Загрузка...</span>
                </div>
              ) : (
                <>
                  {/* Branch selector */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium text-(--hl)">🏷️ Ветка</Label>
                    <div className="flex gap-2">
                      <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        className="flex-1 rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) outline-hidden focus:ring-1 focus:ring-(--hl-md)"
                      >
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <Button
                        className="flex items-center gap-1 rounded-xs border border-solid border-(--hl-md) px-3 py-1.5 text-sm text-(--color-font) transition-colors hover:bg-(--hl-xs) disabled:opacity-50"
                        onPress={handleFetchRemote}
                        isDisabled={fetching}
                      >
                        {fetching ? (
                          <Icon icon="spinner" className="animate-spin" />
                        ) : (
                          <Icon icon="sync" />
                        )}
                        Загрузить
                      </Button>
                    </div>
                  </div>

                  {/* File name info */}
                  <div className="flex items-center gap-2 text-xs text-(--hl)">
                    <Icon icon="file" />
                    <span>Файл: <strong className="text-(--color-font)">{config?.configFileName || 'insomnia-sync.yaml'}</strong></span>
                  </div>

                  {/* Tree (только если уже загружено) */}
                  {tree.length > 0 && (
                    <>
                      <div>
                        <Label className="mb-1 block text-xs font-medium text-(--hl)">
                          Содержимое удалённого файла
                        </Label>
                        <TreeSelector
                          data={tree}
                          selectedIds={selectedIds}
                          onSelectionChange={setSelectedIds}
                        />
                      </div>

                      {/* Import mode */}
                      <RadioGroup
                        value={importMode}
                        onChange={v => setImportMode(v as 'overwrite' | 'merge')}
                        className="flex flex-col gap-2"
                      >
                        <Label className="text-xs font-medium text-(--hl)">Режим импорта</Label>
                        <div className="flex gap-2">
                          <Radio
                            value="overwrite"
                            className="flex-1 cursor-pointer rounded-xs border border-solid border-(--hl-md) p-3 transition-colors hover:bg-(--hl-xs) data-selected:border-(--color-surprise) data-selected:ring-1 data-selected:ring-(--color-surprise)"
                          >
                            <div className="text-sm font-medium">Перезаписать всё</div>
                            <div className="mt-0.5 text-xs text-(--hl)">Очистить workspace и импортировать</div>
                          </Radio>
                          <Radio
                            value="merge"
                            className="flex-1 cursor-pointer rounded-xs border border-solid border-(--hl-md) p-3 transition-colors hover:bg-(--hl-xs) data-selected:border-(--color-surprise) data-selected:ring-1 data-selected:ring-(--color-surprise)"
                          >
                            <div className="text-sm font-medium">Объединить</div>
                            <div className="mt-0.5 text-xs text-(--hl)">Добавить к существующему</div>
                          </Radio>
                        </div>
                      </RadioGroup>
                    </>
                  )}

                  {!parsedV5 && !fetching && !error && (
                    <div className="rounded-xs border border-dashed border-(--hl-md) px-4 py-8 text-center text-sm text-(--hl)">
                      Выберите ветку и нажмите «Загрузить»
                    </div>
                  )}

                  {/* Error / Success */}
                  {error && (
                    <div className="rounded-xs border border-solid border-(--color-danger) bg-[rgba(var(--color-danger-rgb),0.1)] px-3 py-2 text-xs text-(--color-danger)">
                      ⚠️ {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-xs border border-solid border-(--color-success) bg-[rgba(var(--color-success-rgb),0.1)] px-3 py-2 text-xs text-(--color-success)">
                      ✅ {success}
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-solid border-(--hl-sm) pt-3">
                <Button
                  className="rounded-xs border border-solid border-(--hl-md) px-4 py-1.5 text-sm text-(--color-font) transition-colors hover:bg-(--hl-xs)"
                  onPress={close}
                >
                  Отмена
                </Button>
                <Button
                  className="flex items-center gap-1 rounded-xs bg-(--color-success) px-4 py-1.5 text-sm font-medium text-(--color-font-success) transition-colors hover:opacity-90 disabled:opacity-50"
                  onPress={handlePull}
                  isDisabled={pulling || !parsedV5 || selectedIds.size === 0}
                >
                  {pulling && <Icon icon="spinner" className="animate-spin" />}
                  📥 Pull
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
