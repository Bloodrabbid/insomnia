import fs from 'node:fs';

import { extension as mimeExtension } from 'mime-types';
import React, { type FC, useCallback, useMemo, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs, Toolbar, Button, Input, SearchField } from 'react-aria-components';
import { useRouteLoaderData } from 'react-router';

import { PREVIEW_MODE_SOURCE } from '../../../common/constants';
import { getSetCookieHeaders } from '../../../common/misc';
import * as models from '../../../models';
import { cancelRequestById } from '../../../network/cancellation';
import { jsonPrettify } from '../../../utils/prettify/json';
import { useExecutionState } from '../../hooks/use-execution-state';
import { useRequestMetaPatcher } from '../../hooks/use-request';
import type { RequestLoaderData } from '../../routes/request';
import { useRootLoaderData } from '../../routes/root';
import { PreviewModeDropdown } from '../dropdowns/preview-mode-dropdown';
import { ResponseHistoryDropdown } from '../dropdowns/response-history-dropdown';
import { MockResponseExtractor } from '../editors/mock-response-extractor';
import { ErrorBoundary } from '../error-boundary';
import { showError } from '../modals';
import { ResponseTimer } from '../response-timer';
import { SizeTag } from '../tags/size-tag';
import { StatusTag } from '../tags/status-tag';
import { TimeTag } from '../tags/time-tag';
import { ResponseCookiesViewer } from '../viewers/response-cookies-viewer';
import { ResponseHeadersViewer } from '../viewers/response-headers-viewer';
import { ResponseTimelineViewer } from '../viewers/response-timeline-viewer';
import { ResponseViewer } from '../viewers/response-viewer';
import { BlankPane } from './blank-pane';
import { Pane, PaneHeader } from './pane';
import { PlaceholderResponsePane } from './placeholder-response-pane';
import { RequestTestResultPane } from './request-test-result-pane';
import { Icon } from '../icon';

interface Props {
  activeRequestId: string;
}
export const ResponsePane: FC<Props> = ({ activeRequestId }) => {
  const { activeRequest, activeRequestMeta, activeResponse } = useRouteLoaderData(
    'request/:requestId',
  ) as RequestLoaderData;
  const filterHistory = activeRequestMeta.responseFilterHistory || [];
  const filter = activeRequestMeta.responseFilter || '';
  const [simpleTextSearch, setSimpleTextSearch] = useState('');
  const [appliedFilter, setAppliedFilter] = useState(''); // Отслеживаем примененный фильтр
  const patchRequestMeta = useRequestMetaPatcher();
  const { settings } = useRootLoaderData();
  const previewMode = activeRequestMeta.previewMode || PREVIEW_MODE_SOURCE;
  const handleSetFilter = async (responseFilter: string) => {
    if (!activeResponse) {
      return;
    }
    const requestId = activeResponse.parentId;
    await patchRequestMeta(requestId, { responseFilter });
    const meta = await models.requestMeta.getByParentId(requestId);
    if (!meta) {
      return;
    }
    const responseFilterHistory = meta.responseFilterHistory.slice(0, 10);
    // Already in history or empty?
    if (!responseFilter || responseFilterHistory.includes(responseFilter)) {
      return;
    }
    responseFilterHistory.unshift(responseFilter);
    patchRequestMeta(requestId, { responseFilterHistory });
  };

  // Собственная логика поиска, работающая независимо от системы фильтров
  const searchResponseContent = useCallback((searchText: string) => {
    if (!searchText.trim() || !activeResponse) {
      return null;
    }
    
    try {
      const bodyBuffer = activeResponse.bodyBuffer;
      if (!bodyBuffer) return null;
      
      const bodyText = bodyBuffer.toString('utf8');
      const searchLower = searchText.toLowerCase();
      
      // Если это JSON, попробуем найти в нем
      if (activeResponse.contentType?.includes('json')) {
        try {
          const jsonObj = JSON.parse(bodyText);
          const foundResults: Array<{path: string, value: any, type: 'key' | 'value', fullObject?: any}> = [];
          
          // Рекурсивная функция для поиска в JSON
          const searchInObject = (obj: any, path = '$', parent?: any): void => {
            if (obj === null || obj === undefined) {
              if (String(obj).toLowerCase().includes(searchLower)) {
                foundResults.push({
                  path: `${path}`,
                  value: obj,
                  type: 'value',
                  fullObject: parent
                });
              }
              return;
            }
            
            if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
              if (String(obj).toLowerCase().includes(searchLower)) {
                foundResults.push({
                  path: `${path}`,
                  value: obj,
                  type: 'value',
                  fullObject: parent
                });
              }
            } else if (Array.isArray(obj)) {
              obj.forEach((item, index) => {
                searchInObject(item, `${path}[${index}]`, obj);
              });
            } else if (typeof obj === 'object') {
              Object.keys(obj).forEach(key => {
                // Проверяем ключ
                if (key.toLowerCase().includes(searchLower)) {
                  foundResults.push({
                    path: `${path}.${key}`,
                    value: key,
                    type: 'key',
                    fullObject: obj
                  });
                }
                // Проверяем значение
                searchInObject(obj[key], `${path}.${key}`, obj);
              });
            }
          };
          
          searchInObject(jsonObj);
          return foundResults.map(result => ({
            displayText: result.type === 'key' 
              ? `${result.path} (ключ)` 
              : `${result.path} = ${result.value}`,
            path: result.path,
            value: result.value,
            type: result.type,
            fullObject: result.fullObject
          }));
        } catch (e) {
          // Если не получилось парсить как JSON, ищем в тексте
        }
      }
      
      // Для всех остальных типов ищем в тексте
      const lines = bodyText.split('\n');
      const foundLines: Array<{displayText: string, lineNumber: number, content: string}> = [];
      
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchLower)) {
          foundLines.push({
            displayText: `Строка ${index + 1}: ${line.trim()}`,
            lineNumber: index + 1,
            content: line.trim()
          });
        }
      });
      
      return foundLines.length > 0 ? foundLines : null;
    } catch (error) {
      console.error('Ошибка поиска:', error);
      return null;
    }
  }, [activeResponse]);

  // Результаты поиска
  const searchResults = useMemo(() => {
    const results = searchResponseContent(simpleTextSearch);
    console.log('Результаты поиска:', results);
    return results;
  }, [searchResponseContent, simpleTextSearch]);

    // Обработчик сброса фильтра
  const handleResetFilter = useCallback(async () => {
    console.log('Сброс фильтра');
    setAppliedFilter('');
    setSimpleTextSearch('');
    await handleSetFilter('');
    
    // Очищаем поле фильтра в CodeEditor
    setTimeout(() => {
      const filterInput = document.querySelector('.editor input[type="text"]') as HTMLInputElement;
      if (filterInput) {
        filterInput.value = '';
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true
        });
        filterInput.dispatchEvent(enterEvent);
      }
    }, 100);
  }, [handleSetFilter]);

  // Обработчик клика по результату поиска
  const handleSearchResultClick = useCallback(async (result: any) => {
    console.log('Клик по результату:', result);
    
    // Проверяем, есть ли путь у результата
    if (!result || !result.path) {
      console.log('Нет пути в результате, очищаем фильтр');
      await handleResetFilter();
      return;
    }
    
    try {
      let filterPath = result.path;
      console.log('Исходный путь:', filterPath);
      
      // Простая очистка пути
      if (filterPath.startsWith('$.')) {
        filterPath = filterPath.substring(2);
      } else if (filterPath.startsWith('$')) {
        filterPath = filterPath.substring(1);
      }
      
      console.log('Очищенный путь:', filterPath);
      
      let finalFilter = '';
      let displayText = '';
      const fullPath = result.path; // Полный путь до найденного элемента
      
      // Применяем простые и надежные фильтры
      if (!filterPath || filterPath === '.' || filterPath === '') {
        console.log('Показываем корень');
        finalFilter = '$';
        displayText = 'Весь ответ';
      } else {
        // Показываем полный путь в строке поиска
        displayText = `Путь: ${fullPath}`;
        
        // Всегда показываем родительский объект вместо конкретного поля для контекста
        const pathParts = filterPath.split('.');
        console.log('Части пути:', pathParts);
        
        if (pathParts.length > 1) {
          // Убираем последнюю часть пути (название поля) чтобы показать родительский объект
          const parentPath = pathParts.slice(0, -1).join('.');
          console.log('Фильтр родительского объекта:', `$.${parentPath}`);
          finalFilter = `$.${parentPath}`;
        } else if (pathParts.length === 1) {
          // Если только один элемент в пути, показываем его
          console.log('Фильтр прямого пути:', `$.${filterPath}`);
          finalFilter = `$.${filterPath}`;
        } else {
          // Показываем весь корень
          console.log('Показываем корень как fallback');
          finalFilter = '$';
          displayText = 'Весь ответ';
        }
      }
      
      // Устанавливаем состояние фильтра
      setAppliedFilter(finalFilter);
      setSimpleTextSearch(displayText);
      
      // Устанавливаем фильтр
      console.log('Применяем фильтр:', finalFilter);
      await handleSetFilter(finalFilter);
      
      // Даём время для установки фильтра, затем принудительно применяем его
      // Эмулируем нажатие Enter в поле фильтра CodeEditor
      setTimeout(() => {
        // Ищем поле фильтра и программно вызываем событие Enter
        const filterInput = document.querySelector('.editor input[type="text"]') as HTMLInputElement;
        if (filterInput) {
          // Устанавливаем значение в поле фильтра
          filterInput.value = finalFilter;
          
          // Создаём и отправляем событие Enter
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
          });
          
          console.log('Отправляем Enter событие в поле фильтра');
          filterInput.dispatchEvent(enterEvent);
        } else {
          console.warn('Поле фильтра не найдено');
        }
      }, 100);
      
    } catch (error) {
      console.error('Ошибка создания фильтра:', error);
      await handleResetFilter();
    }
  }, [handleSetFilter, handleResetFilter]);

  // Обработчик изменения поискового запроса (НЕ интегрируется с фильтрами)
  const handleSimpleSearchChange = useCallback((searchText: string) => {
    setSimpleTextSearch(searchText);
    // НЕ вызываем handleSetFilter, чтобы избежать ошибок JSONPath
  }, []);

  const { isExecuting, steps } = useExecutionState({ requestId: activeRequest._id });

  const handleDownloadResponseBody = useCallback(
    async (prettify: boolean) => {
      if (!activeResponse || !activeRequest) {
        console.warn('Nothing to download');
        return;
      }

      const { contentType } = activeResponse;
      const extension = mimeExtension(contentType) || 'unknown';
      const { canceled, filePath: outputPath } = await window.dialog.showSaveDialog({
        title: 'Save Response Body',
        buttonLabel: 'Save',
        defaultPath: `${activeRequest.name.replace(/ +/g, '_')}-${Date.now()}.${extension}`,
      });

      if (canceled) {
        return;
      }

      const readStream = models.response.getBodyStream(activeResponse);
      const dataBuffers: any[] = [];

      if (readStream && outputPath && typeof readStream !== 'string') {
        readStream.on('data', data => {
          dataBuffers.push(data);
        });
        readStream.on('end', () => {
          const to = fs.createWriteStream(outputPath);
          const finalBuffer = Buffer.concat(dataBuffers);
          to.on('error', err => {
            showError({
              title: 'Save Failed',
              message: 'Failed to save response body',
              error: err,
            });
          });

          if (prettify && contentType.includes('json')) {
            to.write(jsonPrettify(finalBuffer.toString('utf8')));
          } else {
            to.write(finalBuffer);
          }

          to.end();
        });
      }
    },
    [activeRequest, activeResponse],
  );

  const { passedTestCount, totalTestCount } = useMemo(() => {
    let passedTestCount = 0;
    let totalTestCount = 0;
    activeResponse?.requestTestResults.forEach(result => {
      if (result.status === 'passed') {
        passedTestCount++;
      }
      totalTestCount++;
    });
    return { passedTestCount, totalTestCount };
  }, [activeResponse]);
  const testResultCountTagColor =
    totalTestCount > 0 ? (passedTestCount === totalTestCount ? 'bg-lime-600' : 'bg-red-600') : 'bg-[var(--hl-sm)]';

  if (!activeRequest) {
    return <BlankPane type="response" />;
  }

  // If there is no previous response, show placeholder for loading indicator
  if (!activeResponse) {
    return (
      <PlaceholderResponsePane>
        {isExecuting && (
          <ResponseTimer
            handleCancel={() => cancelRequestById(activeRequest._id)}
            activeRequestId={activeRequestId}
            steps={steps}
          />
        )}
      </PlaceholderResponsePane>
    );
  }

  const timeline = models.response.getTimeline(activeResponse);
  const cookieHeaders = getSetCookieHeaders(activeResponse.headers);

  return (
    <Pane type="response">
      {!activeResponse ? null : (
        <PaneHeader className="row-spaced">
          <div aria-atomic="true" aria-live="polite" className="no-wrap scrollable scrollable--no-bars pad-left">
            <StatusTag statusCode={activeResponse.statusCode} statusMessage={activeResponse.statusMessage} />
            <TimeTag milliseconds={activeResponse.elapsedTime} steps={steps} />
            <SizeTag bytesRead={activeResponse.bytesRead} bytesContent={activeResponse.bytesContent} />
          </div>
          <ResponseHistoryDropdown activeResponse={activeResponse} />
        </PaneHeader>
      )}
      <Tabs aria-label="Request group tabs" className="flex h-full w-full flex-1 flex-col">
        <TabList
          className="flex h-[--line-height-sm] w-full flex-shrink-0 items-center overflow-x-auto border-b border-solid border-b-[--hl-md] bg-[--color-bg]"
          aria-label="Request pane tabs"
        >
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="preview"
          >
            Preview
          </Tab>
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="headers"
          >
            Headers
            {activeResponse.headers.length > 0 && (
              <span className="shadow-small flex aspect-square items-center justify-between overflow-hidden rounded-lg border border-solid border-[--hl-md] p-2 text-xs">
                {activeResponse.headers.length}
              </span>
            )}
          </Tab>
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="cookies"
          >
            Cookies
            {cookieHeaders.length > 0 && (
              <span className="shadow-small flex aspect-square items-center justify-between overflow-hidden rounded-lg border border-solid border-[--hl-md] p-2 text-xs">
                {cookieHeaders.length}
              </span>
            )}
          </Tab>
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="test-results"
          >
            <div>
              <span>Tests</span>
              <span className={`ml-1 rounded-sm px-1 ${testResultCountTagColor}`} style={{ color: 'white' }}>
                {`${passedTestCount} / ${totalTestCount}`}
              </span>
            </div>
          </Tab>
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="mock-response"
          >
            → Mock
          </Tab>
          <Tab
            className="flex h-full flex-shrink-0 cursor-pointer select-none items-center justify-between gap-2 px-3 py-1 text-[--hl] outline-none transition-colors duration-300 hover:bg-[--hl-sm] hover:text-[--color-font] focus:bg-[--hl-sm] aria-selected:bg-[--hl-xs] aria-selected:text-[--color-font] aria-selected:hover:bg-[--hl-sm] aria-selected:focus:bg-[--hl-sm]"
            id="timeline"
          >
            Console
          </Tab>
        </TabList>
        <TabPanel className="flex w-full flex-1 flex-col overflow-hidden" id="preview">
          <Toolbar className="flex h-[--line-height-sm] w-full flex-shrink-0 items-center border-b border-solid border-[--hl-md] px-2 gap-2">
            <PreviewModeDropdown
              download={handleDownloadResponseBody}
              copyToClipboard={async () => {
                const bodyBuffer = activeResponse ? await models.response.getBodyBuffer(activeResponse) : null;
                if (bodyBuffer) {
                  window.clipboard.writeText(bodyBuffer.toString('utf8'));
                }
              }}
            />
            
            <div className="flex-1 max-w-md relative">
              <SearchField
                aria-label={appliedFilter ? "Примененный фильтр" : "Поиск в ответе"}
                className="group relative flex w-full"
                value={simpleTextSearch}
                onChange={appliedFilter ? undefined : handleSimpleSearchChange}
              >
                <Input
                  placeholder={appliedFilter ? "" : "Поиск в ответе (текст, числа, ключи)..."}
                  className={`w-full rounded-sm border border-solid py-1 pl-2 text-xs text-[--color-font] transition-colors focus:outline-none focus:ring-1 focus:ring-[--hl-md] ${
                    appliedFilter 
                      ? 'pr-16 border-[--color-success] bg-[--color-success-bg] font-medium' 
                      : 'pr-7 border-[--hl-sm] bg-[--color-bg] placeholder:italic'
                  }`}
                  readOnly={!!appliedFilter}
                />
                <div className="absolute right-0 top-0 flex h-full items-center px-2 gap-1">
                  {appliedFilter && (
                    <Button 
                      className="flex aspect-square w-4 items-center justify-center rounded-sm text-xs text-[--color-font] ring-1 ring-transparent transition-all hover:bg-[--hl-xs] focus:ring-inset focus:ring-[--hl-md] aria-pressed:bg-[--hl-sm]"
                      onPress={handleResetFilter}
                      aria-label="Сбросить фильтр"
                    >
                      <Icon icon="times" />
                    </Button>
                  )}
                  {!appliedFilter && simpleTextSearch && (
                    <Button 
                      className="flex aspect-square w-4 items-center justify-center rounded-sm text-xs text-[--color-font] ring-1 ring-transparent transition-all hover:bg-[--hl-xs] focus:ring-inset focus:ring-[--hl-md] aria-pressed:bg-[--hl-sm] group-data-[empty]:hidden"
                      onPress={() => handleSimpleSearchChange('')}
                    >
                      <Icon icon="close" />
                    </Button>
                  )}
                </div>
              </SearchField>
              
              {/* Результаты поиска в выпадающем списке (только в режиме поиска) */}
              {!appliedFilter && simpleTextSearch && searchResults && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[--color-bg] border border-[--hl-sm] rounded shadow-lg max-h-64 overflow-y-auto">
                  <div className="px-2 py-1 text-xs font-medium text-[--hl] bg-[--hl-xs] border-b border-[--hl-sm]">
                    Найдено {searchResults.length} совпадений:
                  </div>
                  {searchResults.slice(0, 15).map((result: any, index: number) => (
                    <button
                      key={index}
                      className="w-full text-left px-2 py-1 text-xs font-mono hover:bg-[--hl-xs] focus:bg-[--hl-xs] focus:outline-none border-b border-[--hl-xs] last:border-b-0 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Клик событие сработало', result);
                        handleSearchResultClick(result);
                      }}
                      aria-label="Нажмите для фильтрации"
                    >
                      <div className="truncate text-[--color-font]">
                        {typeof result === 'string' ? result : result.displayText}
                      </div>
                      <div className="text-[--hl] text-xs opacity-70">
                        {result.path ? `путь: ${result.path}` : 'нет пути'}
                      </div>
                    </button>
                  ))}
                  {searchResults.length > 15 && (
                    <div className="px-2 py-1 text-xs text-[--hl] italic bg-[--hl-xs]">
                      ...и ещё {searchResults.length - 15}
                    </div>
                  )}
                </div>
              )}
              
              {!appliedFilter && simpleTextSearch && !searchResults && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[--color-bg] border border-[--hl-sm] rounded shadow-lg">
                  <div className="px-2 py-2 text-xs text-[--hl]">
                    Ничего не найдено
                  </div>
                </div>
              )}
              
              {/* Индикатор примененного фильтра */}
              {appliedFilter && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[--color-success-bg] border border-[--color-success] rounded shadow-lg">
                  <div className="px-2 py-2 text-xs text-[--color-success]">
                    ✓ Фильтр применен. Нажмите ✕ для сброса.
                  </div>
                </div>
              )}
            </div>
          </Toolbar>
          <ResponseViewer
            key={activeResponse._id}
            bytes={Math.max(activeResponse.bytesContent, activeResponse.bytesRead)}
            contentType={activeResponse.contentType || ''}
            disableHtmlPreviewJs={settings.disableHtmlPreviewJs}
            disablePreviewLinks={settings.disableResponsePreviewLinks}
            download={handleDownloadResponseBody}
            editorFontSize={settings.editorFontSize}
            error={activeResponse.error}
            filter={filter}
            filterHistory={filterHistory}
            bodyBuffer={activeResponse.bodyBuffer}
            getBody={() => models.response.getBodyBuffer(activeResponse)}
            previewMode={activeResponse.error ? PREVIEW_MODE_SOURCE : previewMode}
            responseId={activeResponse._id}
            updateFilter={activeResponse.error ? undefined : handleSetFilter}
            url={activeResponse.url}
          />
        </TabPanel>
        <TabPanel className="flex w-full flex-1 flex-col overflow-y-auto" id="headers">
          <ErrorBoundary key={activeResponse._id} errorClassName="font-error pad text-center">
            <ResponseHeadersViewer headers={activeResponse.headers} />
          </ErrorBoundary>
        </TabPanel>
        <TabPanel className="flex w-full flex-1 flex-col overflow-y-auto" id="cookies">
          <ErrorBoundary key={activeResponse._id} errorClassName="font-error pad text-center">
            <ResponseCookiesViewer
              cookiesSent={activeResponse.settingSendCookies}
              cookiesStored={activeResponse.settingStoreCookies}
              headers={cookieHeaders}
            />
          </ErrorBoundary>
        </TabPanel>
        <TabPanel className="flex w-full flex-1 flex-col overflow-y-auto" id="test-results">
          <RequestTestResultPane requestTestResults={activeResponse.requestTestResults} />
        </TabPanel>
        <TabPanel className="flex w-full flex-1 flex-col overflow-y-auto" id="mock-response">
          <MockResponseExtractor />
        </TabPanel>
        <TabPanel className="flex w-full flex-1 flex-col overflow-y-auto" id="timeline">
          <ErrorBoundary key={activeResponse._id} errorClassName="font-error pad text-center">
            <ResponseTimelineViewer key={activeResponse._id} timeline={timeline} />
          </ErrorBoundary>
        </TabPanel>
      </Tabs>
      <ErrorBoundary errorClassName="font-error pad text-center">
        {isExecuting && (
          <ResponseTimer
            handleCancel={() => cancelRequestById(activeRequest._id)}
            activeRequestId={activeRequestId}
            steps={steps}
          />
        )}
      </ErrorBoundary>
    </Pane>
  );
};
