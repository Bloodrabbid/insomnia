/**
 * GitLab Push Modal — отправка workspace в GitLab с выбором элементов.
 */
import yaml from 'js-yaml';
import { type FC, useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from 'react-aria-components';
import { useParams } from 'react-router';

import { getInsomniaV5DataExport } from '~/common/insomnia-v5';
import { Icon } from '~/ui/components/icon';
import { TreeSelector } from '~/ui/components/gitlab-sync/tree-selector';
import { type GitLabSyncConfig, loadGitLabConfig } from '~/ui/services/gitlab-sync-config';
import { GitLabSyncService } from '~/ui/services/gitlab-sync';
import { type TreeNode, collectAllIds, filterV5Collection, filterV5EnvironmentsBySelection, parseCollectionToTree, parseEnvironmentsToTree } from '~/ui/services/gitlab-sync-utils';

interface GitLabPushModalProps {
  onClose: () => void;
}

export const GitLabPushModal: FC<GitLabPushModalProps> = ({ onClose }) => {
  const { workspaceId } = useParams() as { workspaceId: string };

  const [config, setConfig] = useState<GitLabSyncConfig | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchInput, setBranchInput] = useState('');

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [rawV5Data, setRawV5Data] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [envTree, setEnvTree] = useState<TreeNode[]>([]);
  const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());

  const [pushRequests, setPushRequests] = useState(true);
  const [pushEnvironments, setPushEnvironments] = useState(true);
  const [commitMessage, setCommitMessage] = useState('Update workspace');
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Загружаем конфиг + ветки + export workspace
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
        setBranchInput(cfg.branch);

        // Параллельно: список веток + экспорт workspace
        const service = new GitLabSyncService(cfg);
        const [branchList, exportYaml] = await Promise.all([
          service.fetchBranches().catch(() => [cfg.branch]),
          getInsomniaV5DataExport({
            workspaceId,
            includePrivateEnvironments: false,
          }),
        ]);

        setBranches(branchList);

        // Парсим YAML export в JSON для дерева
        let parsed: any;
        try {
          parsed = yaml.load(exportYaml);
        } catch {
          // Пробуем как JSON
          parsed = JSON.parse(exportYaml);
        }

        setRawV5Data(parsed);

        if (parsed?.collection) {
          const treeData = parseCollectionToTree(parsed.collection);
          setTree(treeData);
          setSelectedIds(collectAllIds(treeData));

          // Парсим окружения
          const envTreeData = parseEnvironmentsToTree(parsed);
          setEnvTree(envTreeData);
          setSelectedEnvIds(collectAllIds(envTreeData));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  // 2. Push
  const handlePush = useCallback(async () => {
    if (!config || !rawV5Data) return;
    setPushing(true);
    setError('');
    setSuccess('');

    try {
      let dataToSend = { ...rawV5Data };

      // 1. Фильтрация запросов
      if (!pushRequests) {
        dataToSend.collection = [];
      } else {
        const allIds = collectAllIds(tree);
        if (selectedIds.size < allIds.size) {
          dataToSend.collection = filterV5Collection(rawV5Data.collection || [], selectedIds);
        }
      }

      // 2. Фильтрация окружений
      if (!pushEnvironments) {
        dataToSend.environments = undefined;
      } else {
        const allEnvIds = collectAllIds(envTree);
        if (selectedEnvIds.size === 0) {
          dataToSend.environments = undefined;
        } else if (selectedEnvIds.size < allEnvIds.size) {
          dataToSend = filterV5EnvironmentsBySelection(dataToSend, selectedEnvIds);
        }
      }

      // Сериализуем обратно в YAML
      const content = yaml.dump(dataToSend, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
      });

      const targetBranch = branchInput || selectedBranch || config.branch;
      const service = new GitLabSyncService(config);
      await service.pushWorkspace(content, commitMessage, targetBranch);

      setSuccess(`Успешно отправлено в ветку "${targetBranch}"`);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPushing(false);
    }
  }, [config, rawV5Data, pushRequests, tree, selectedIds, pushEnvironments, envTree, selectedEnvIds, commitMessage, branchInput, selectedBranch, onClose]);

  return (
    <ModalOverlay
      isOpen
      onOpenChange={isOpen => !isOpen && onClose()}
      isDismissable
      className="fixed top-0 left-0 z-10 flex h-(--visual-viewport-height) w-full items-center justify-center bg-black/30"
    >
      <Modal
        onOpenChange={isOpen => !isOpen && onClose()}
        className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) p-(--padding-lg) text-(--color-font)"
      >
        <Dialog className="outline-hidden">
          {({ close }) => (
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <Heading className="flex items-center gap-2 text-lg font-semibold">
                  <Icon icon="upload" className="text-(--color-surprise)" />
                  GitLab — Push Workspace
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
                        onChange={e => {
                          setSelectedBranch(e.target.value);
                          setBranchInput(e.target.value);
                        }}
                        className="flex-1 rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) outline-hidden focus:ring-1 focus:ring-(--hl-md)"
                      >
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <Input
                        value={branchInput}
                        onChange={e => setBranchInput((e.target as HTMLInputElement).value)}
                        placeholder="или введите вручную"
                        className="w-40 rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) outline-hidden focus:ring-1 focus:ring-(--hl-md)"
                      />
                    </div>
                  </div>

                  {/* File name (readonly info) */}
                  <div className="flex items-center gap-2 text-xs text-(--hl)">
                    <Icon icon="file" />
                    <span>Файл: <strong className="text-(--color-font)">{config?.configFileName || 'insomnia-sync.yaml'}</strong></span>
                  </div>

                  {/* Двухпанельный лейаут */}
                  <div className="flex gap-4">
                    {/* Запросы */}
                    <div className="flex flex-1 flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="push-requests"
                          checked={pushRequests}
                          onChange={e => setPushRequests(e.target.checked)}
                          className="h-4 w-4 rounded-xs border-(--hl-md) bg-(--color-bg) text-(--color-surprise) focus:ring-(--color-surprise)"
                        />
                        <Label htmlFor="push-requests" className="block text-xs font-bold text-(--hl) uppercase cursor-pointer select-none">
                          📋 Запросы
                        </Label>
                      </div>
                      
                      <div className={pushRequests ? '' : 'opacity-50 pointer-events-none'}>
                        <TreeSelector
                          data={tree}
                          selectedIds={selectedIds}
                          onSelectionChange={setSelectedIds}
                        />
                      </div>
                    </div>

                    {/* Окружения */}
                    <div className="flex flex-1 flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="push-envs"
                          checked={pushEnvironments}
                          onChange={e => setPushEnvironments(e.target.checked)}
                          className="h-4 w-4 rounded-xs border-(--hl-md) bg-(--color-bg) text-(--color-surprise) focus:ring-(--color-surprise)"
                        />
                        <Label htmlFor="push-envs" className="block text-xs font-bold text-(--hl) uppercase cursor-pointer select-none">
                          🔧 Переменные окружения
                        </Label>
                      </div>

                      <div className={pushEnvironments ? '' : 'opacity-50 pointer-events-none'}>
                        {envTree.length > 0 ? (
                          <TreeSelector
                            data={envTree}
                            selectedIds={selectedEnvIds}
                            onSelectionChange={setSelectedEnvIds}
                          />
                        ) : (
                          <div className="rounded-md border border-dashed border-(--hl-md) px-4 py-8 text-center text-sm text-(--hl)">
                            Нет окружений в workspace
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Commit message */}
                  <TextField
                    value={commitMessage}
                    onChange={setCommitMessage}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      💬 Commit Message
                    </Label>
                    <Input
                      className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                    />
                  </TextField>

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
                  className="flex items-center gap-1 rounded-xs bg-(--color-surprise) px-4 py-1.5 text-sm font-medium text-(--color-font-surprise) transition-colors hover:opacity-90 disabled:opacity-50"
                  onPress={handlePush}
                  isDisabled={pushing || loading || (!(pushRequests && selectedIds.size > 0) && !(pushEnvironments && selectedEnvIds.size > 0)) || !!error && !rawV5Data}
                >
                  {pushing && <Icon icon="spinner" className="animate-spin" />}
                  📤 Push
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
