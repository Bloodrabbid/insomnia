import { URL } from 'node:url';

import React, { type FC, Fragment, useMemo, useState } from 'react';
import { Button, Input, SearchField } from 'react-aria-components';

import type { ResponseHeader } from '../../../models/response';
import { CopyButton } from '../base/copy-button';
import { Link } from '../base/link';
import { Icon } from '../icon';

interface Props {
  headers: ResponseHeader[];
}

const validateURL = ({ value }: ResponseHeader) => {
  try {
    const parsedUrl = new URL(value);
    return Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
};

const headerAsString = (header: ResponseHeader) => `${header.name}: ${header.value}`;

export const ResponseHeadersViewer: FC<Props> = ({ headers }) => {
  const [searchFilter, setSearchFilter] = useState('');
  
  const filteredHeaders = useMemo(() => {
    if (!searchFilter.trim()) {
      return headers;
    }
    
    const filter = searchFilter.toLowerCase().trim();
    return headers.filter(header => 
      header.name.toLowerCase().includes(filter) || 
      header.value.toLowerCase().includes(filter)
    );
  }, [headers, searchFilter]);

  const headersString = useMemo(() => filteredHeaders.map(headerAsString).join('\n'), [filteredHeaders]);

  return (
    <Fragment>
      {headers.length > 0 && (
        <div className="border-b border-solid border-[--hl-md] p-2">
          <SearchField
            aria-label="Поиск заголовков"
            className="group relative flex w-full"
            value={searchFilter}
            onChange={setSearchFilter}
          >
            <Input
              placeholder="Поиск по имени или значению заголовка..."
              className="w-full rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] py-1 pl-2 pr-7 text-[--color-font] transition-colors placeholder:italic focus:outline-none focus:ring-1 focus:ring-[--hl-md]"
            />
            <div className="absolute right-0 top-0 flex h-full items-center px-2">
              <Button className="flex aspect-square w-5 items-center justify-center rounded-sm text-sm text-[--color-font] ring-1 ring-transparent transition-all hover:bg-[--hl-xs] focus:ring-inset focus:ring-[--hl-md] aria-pressed:bg-[--hl-sm] group-data-[empty]:hidden">
                <Icon icon="close" />
              </Button>
            </div>
          </SearchField>
        </div>
      )}
      
      <div className="overflow-auto">
        <table className="table--fancy table--striped table--compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredHeaders.length > 0 ? (
              filteredHeaders.map(header => (
                <tr className="selectable" key={headerAsString(header)}>
                  <td className="force-wrap w-1/2">{header.name}</td>
                  <td className="force-wrap w-1/2">
                    {validateURL(header) ? <Link href={header.value}>{header.value}</Link> : header.value}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-center text-[--hl] italic py-4">
                  {searchFilter ? 'Заголовки не найдены' : 'Нет заголовков'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredHeaders.length > 0 && (
        <p key="copy" className="pad-top">
          <CopyButton className="pull-right" content={headersString} />
        </p>
      )}
      
      {searchFilter && filteredHeaders.length !== headers.length && (
        <div className="text-xs text-[--hl] p-2 border-t border-solid border-[--hl-md]">
          Показано {filteredHeaders.length} из {headers.length} заголовков
        </div>
      )}
    </Fragment>
  );
};
