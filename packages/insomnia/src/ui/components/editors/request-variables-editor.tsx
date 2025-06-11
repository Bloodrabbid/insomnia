import React, { type FC, useState, useMemo } from 'react';
import { Button, Heading, Input, Label, Select, ListBox, ListBoxItem, SelectValue, ToggleButton, Popover } from 'react-aria-components';
import { useParams, useRouteLoaderData } from 'react-router';

import { useRequestMetaPatcher } from '../../hooks/use-request';
import type { RequestLoaderData } from '../../routes/request';
import { Icon } from '../icon';
import { OneLineEditor } from '../codemirror/one-line-editor';

interface RequestVariable {
  id: string;
  name: string;
  value: string;
  description?: string;
  enabled: boolean;
  target: 'url' | 'body' | 'header';
}

interface Props {
  requestId: string;
}

export const RequestVariablesEditor: FC<Props> = ({ requestId }) => {
  const { activeRequestMeta } = useRouteLoaderData('request/:requestId') as RequestLoaderData;
  const patchRequestMeta = useRequestMetaPatcher();
  
  // Получаем переменные из метаданных запроса
  const variables = useMemo((): RequestVariable[] => {
    const vars = activeRequestMeta?.variables || [];
    return Array.isArray(vars) ? vars : [];
  }, [activeRequestMeta?.variables]);

  const [newVariable, setNewVariable] = useState<Partial<RequestVariable>>({
    name: '',
    value: '',
    description: '',
    enabled: true,
    target: 'url',
  });

  const updateVariables = (newVariables: RequestVariable[]) => {
    patchRequestMeta(requestId, {
      variables: newVariables,
    });
  };

  const addVariable = () => {
    const trimmedName = (newVariable.name || '').trim();
    const trimmedValue = (newVariable.value || '').trim();
    
    if (!trimmedName || !trimmedValue) {
      return;
    }

    const variable: RequestVariable = {
      id: `var_${Date.now()}`,
      name: trimmedName,
      value: trimmedValue,
      description: newVariable.description || '',
      enabled: newVariable.enabled !== false,
      target: newVariable.target || 'url',
    };

    updateVariables([...variables, variable]);
    setNewVariable({
      name: '',
      value: '',
      description: '',
      enabled: true,
      target: 'url',
    });
  };

  const updateVariable = (id: string, updates: Partial<RequestVariable>) => {
    const newVariables = variables.map(variable =>
      variable.id === id ? { ...variable, ...updates } : variable
    );
    updateVariables(newVariables);
  };

  const deleteVariable = (id: string) => {
    const newVariables = variables.filter(variable => variable.id !== id);
    updateVariables(newVariables);
  };

  const enabledVariablesCount = variables.filter(v => v.enabled).length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b border-solid border-[--hl-sm] p-4">
        <Heading className="text-sm font-bold">
          Переменные запроса {enabledVariablesCount > 0 && <span className="text-[--hl]">({enabledVariablesCount})</span>}
        </Heading>
        <Button
          onPress={addVariable}
          isDisabled={!(newVariable.name || '').trim() || !(newVariable.value || '').trim()}
          className="flex items-center gap-2 rounded-sm bg-[--color-surprise] px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          <Icon icon="plus" />
          Добавить
        </Button>
      </div>

      {/* Справка */}
      <div className="border-b border-solid border-[--hl-sm] bg-[--hl-xxs] p-4 text-sm text-[--hl]">
        <p className="mb-2">
          <strong>Как использовать:</strong> Переменные можно подставлять в URL, тело запроса или заголовки используя синтаксис <code className="bg-[--hl-xs] px-1 rounded">{'{{имя_переменной}}'}</code>
        </p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <strong>URL:</strong> <code>{'{{api_key}}'}</code> в параметрах
          </div>
          <div>
            <strong>Body:</strong> <code>{'{{user_id}}'}</code> в JSON
          </div>
          <div>
            <strong>Headers:</strong> <code>{'{{auth_token}}'}</code> в значениях
          </div>
        </div>
      </div>

      {/* Список переменных */}
      <div className="flex-1 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[--hl]">
            <div>
              <Icon icon="code" className="mb-2 text-2xl" />
              <p>Нет переменных</p>
              <p className="text-xs">Добавьте переменные для динамических запросов</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {variables.map((variable) => (
              <div
                key={variable.id}
                className={`grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 items-center p-3 border border-solid rounded-sm ${
                  variable.enabled ? 'border-[--hl-sm] bg-[--color-bg]' : 'border-[--hl-xs] bg-[--hl-xxs] opacity-60'
                }`}
              >
                {/* Enabled toggle */}
                <ToggleButton
                  isSelected={variable.enabled}
                  onChange={(enabled) => updateVariable(variable.id, { enabled })}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <Icon
                    icon={variable.enabled ? 'check-square' : 'square'}
                    className={variable.enabled ? 'text-[--color-success]' : 'text-[--hl]'}
                  />
                </ToggleButton>

                {/* Variable name */}
                <OneLineEditor
                  id={`variable-name-${variable.id}`}
                  placeholder="variable_name"
                  defaultValue={variable.name}
                  onChange={(name) => updateVariable(variable.id, { name })}
                />

                {/* Variable value */}
                <OneLineEditor
                  id={`variable-value-${variable.id}`}
                  placeholder="Значение переменной"
                  defaultValue={variable.value}
                  onChange={(value) => updateVariable(variable.id, { value })}
                />

                {/* Target selector */}
                <Select
                  selectedKey={variable.target}
                  onSelectionChange={(target) => updateVariable(variable.id, { target: target as 'url' | 'body' | 'header' })}
                  className="min-w-20"
                >
                  <Button className="flex items-center justify-between rounded-sm border border-solid border-[--hl-sm] px-2 py-1 text-sm min-w-20">
                    <SelectValue>
                      {({ selectedText }) => selectedText}
                    </SelectValue>
                    <Icon icon="caret-down" className="text-xs" />
                  </Button>
                  <Popover className="flex min-w-max flex-col overflow-y-hidden">
                    <ListBox className="border border-solid border-[--hl-sm] bg-[--color-bg] rounded-sm shadow-lg min-w-max select-none overflow-y-auto py-2 text-sm focus:outline-none">
                      <ListBoxItem id="url" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                        URL
                      </ListBoxItem>
                      <ListBoxItem id="body" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                        Body
                      </ListBoxItem>
                      <ListBoxItem id="header" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                        Header
                      </ListBoxItem>
                    </ListBox>
                  </Popover>
                </Select>

                {/* Description */}
                <OneLineEditor
                  id={`variable-desc-${variable.id}`}
                  placeholder="Описание (опционально)"
                  defaultValue={variable.description || ''}
                  onChange={(description) => updateVariable(variable.id, { description })}
                />

                {/* Delete button */}
                <Button
                  onPress={() => deleteVariable(variable.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-[--color-danger] hover:bg-[--hl-xs]"
                  aria-label="Удалить переменную"
                >
                  <Icon icon="trash" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Форма добавления новой переменной */}
      <div className="border-t border-solid border-[--hl-sm] bg-[--hl-xxs] p-4">
        <div className="grid grid-cols-[1fr_1fr_auto_1fr_auto] gap-3 items-end">
          <div>
            <Label className="text-xs text-[--hl] mb-1">Имя переменной</Label>
            <Input
              value={newVariable.name || ''}
              onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
              placeholder="api_key"
              className="w-full px-2 py-1 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
            />
          </div>
          <div>
            <Label className="text-xs text-[--hl] mb-1">Значение</Label>
            <Input
              value={newVariable.value || ''}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
              placeholder="your_api_key_here"
              className="w-full px-2 py-1 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
            />
          </div>
          <div>
            <Label className="text-xs text-[--hl] mb-1">Применить к</Label>
            <Select
              selectedKey={newVariable.target || 'url'}
              onSelectionChange={(target) => setNewVariable({ ...newVariable, target: target as 'url' | 'body' | 'header' })}
            >
              <Button className="flex items-center justify-between rounded-sm border border-solid border-[--hl-sm] px-2 py-1 text-sm min-w-20">
                <SelectValue>
                  {({ selectedText }) => selectedText}
                </SelectValue>
                <Icon icon="caret-down" className="text-xs" />
              </Button>
              <Popover className="flex min-w-max flex-col overflow-y-hidden">
                <ListBox className="border border-solid border-[--hl-sm] bg-[--color-bg] rounded-sm shadow-lg min-w-max select-none overflow-y-auto py-2 text-sm focus:outline-none">
                  <ListBoxItem id="url" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                    URL
                  </ListBoxItem>
                  <ListBoxItem id="body" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                    Body
                  </ListBoxItem>
                  <ListBoxItem id="header" className="px-3 py-2 text-sm hover:bg-[--hl-xs] cursor-pointer bg-transparent transition-colors focus:outline-none disabled:cursor-not-allowed aria-selected:font-bold">
                    Header
                  </ListBoxItem>
                </ListBox>
              </Popover>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-[--hl] mb-1">Описание</Label>
            <Input
              value={newVariable.description || ''}
              onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
              placeholder="Описание переменной"
              className="w-full px-2 py-1 text-sm border border-solid border-[--hl-sm] rounded bg-[--color-bg] text-[--color-font]"
            />
          </div>
          <Button
            onPress={addVariable}
            isDisabled={!(newVariable.name || '').trim() || !(newVariable.value || '').trim()}
            className="px-4 py-1 bg-[--color-surprise] text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            <Icon icon="plus" />
          </Button>
        </div>
      </div>
    </div>
  );
}; 
