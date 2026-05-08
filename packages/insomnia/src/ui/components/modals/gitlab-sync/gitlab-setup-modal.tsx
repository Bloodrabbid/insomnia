/**
 * GitLab Setup Modal — настройки подключения к GitLab.
 */
import { type FC, useEffect, useState } from 'react';
import { Button, Dialog, Heading, Label, Modal, ModalOverlay, TextField, Input, Checkbox } from 'react-aria-components';

import { Icon } from '~/ui/components/icon';
import { type GitLabSyncConfig, getDefaultConfig, loadGitLabConfig, saveGitLabConfig } from '~/ui/services/gitlab-sync-config';

interface GitLabSetupModalProps {
  onClose: () => void;
}

export const GitLabSetupModal: FC<GitLabSetupModalProps> = ({ onClose }) => {
  const [config, setConfig] = useState<GitLabSyncConfig>(getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadGitLabConfig().then(saved => {
      if (saved) {
        setConfig(saved);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGitLabConfig(config);
      onClose();
    } catch (e) {
      console.error('GitLab Sync: save config error:', e);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof GitLabSyncConfig>(field: K, value: GitLabSyncConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ModalOverlay
      isOpen
      onOpenChange={isOpen => !isOpen && onClose()}
      isDismissable
      className="fixed top-0 left-0 z-10 flex h-(--visual-viewport-height) w-full items-center justify-center bg-black/30"
    >
      <Modal
        onOpenChange={isOpen => !isOpen && onClose()}
        className="max-h-full w-full max-w-lg rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) p-(--padding-lg) text-(--color-font)"
      >
        <Dialog className="outline-hidden">
          {({ close }) => (
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <Heading className="flex items-center gap-2 text-lg font-semibold">
                  <Icon icon="cog" className="text-(--hl)" />
                  GitLab Sync — Настройки
                </Heading>
                <Button
                  className="flex aspect-square h-6 shrink-0 items-center justify-center rounded-xs text-sm text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset"
                  onPress={close}
                >
                  <Icon icon="x" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="spinner" className="animate-spin text-(--hl)" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* GitLab URL */}
                  <TextField
                    value={config.baseUrl}
                    onChange={v => updateField('baseUrl', v)}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      GitLab URL
                    </Label>
                    <Input
                      placeholder="https://gitlab.example.com"
                      className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) transition-colors focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                    />
                  </TextField>

                  {/* Access Token */}
                  <TextField
                    value={config.token}
                    onChange={v => updateField('token', v)}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      Access Token
                    </Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="glpat-xxxxxxxxxxxx"
                        className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 pr-8 text-sm text-(--color-font) transition-colors focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                      />
                      <button
                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-transparent text-(--hl) outline-hidden transition-colors hover:text-(--color-font)"
                        onClick={() => setShowToken(!showToken)}
                        type="button"
                      >
                        <Icon icon={showToken ? 'eye-slash' : 'eye'} className="text-xs" />
                      </button>
                    </div>
                  </TextField>

                  {/* Project ID */}
                  <TextField
                    value={config.projectId}
                    onChange={v => updateField('projectId', v)}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      Project ID
                    </Label>
                    <Input
                      placeholder="12345"
                      className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) transition-colors focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                    />
                  </TextField>

                  {/* Branch */}
                  <TextField
                    value={config.branch}
                    onChange={v => updateField('branch', v)}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      Ветка по умолчанию
                    </Label>
                    <Input
                      placeholder="main"
                      className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) transition-colors focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                    />
                  </TextField>

                  {/* Config File Name */}
                  <TextField
                    value={config.configFileName}
                    onChange={v => updateField('configFileName', v)}
                  >
                    <Label className="mb-1 block text-xs font-medium text-(--hl)">
                      Имя файла конфигурации
                    </Label>
                    <Input
                      placeholder="insomnia-sync.yaml"
                      className="w-full rounded-xs border border-solid border-(--hl-sm) bg-(--color-bg) px-3 py-1.5 text-sm text-(--color-font) transition-colors focus:ring-1 focus:ring-(--hl-md) focus:outline-hidden"
                    />
                  </TextField>

                  {/* Clear before import */}
                  <Checkbox
                    isSelected={config.clearBeforeImport}
                    onChange={v => updateField('clearBeforeImport', v)}
                    className="flex items-center gap-2 text-sm text-(--color-font)"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border border-solid transition-colors ${
                        config.clearBeforeImport
                          ? 'border-(--color-surprise) bg-(--color-surprise) text-white'
                          : 'border-(--hl-md) bg-(--color-bg)'
                      }`}
                    >
                      {config.clearBeforeImport && <Icon icon="check" className="text-[10px]" />}
                    </div>
                    <span>Очищать workspace перед импортом</span>
                  </Checkbox>
                </div>
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
                  onPress={handleSave}
                  isDisabled={saving || !config.baseUrl || !config.token || !config.projectId}
                >
                  {saving && <Icon icon="spinner" className="animate-spin" />}
                  💾 Сохранить
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
