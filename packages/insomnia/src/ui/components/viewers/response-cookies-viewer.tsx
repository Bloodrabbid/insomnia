import React, { type FC, useState, useMemo } from 'react';
import { Button, Input, SearchField } from 'react-aria-components';
import { Cookie } from 'tough-cookie';

import { CookiesModal } from '../modals/cookies-modal';
import { Icon } from '../icon';

interface Props {
  cookiesSent?: boolean | null;
  cookiesStored?: boolean | null;
  headers: any[];
}

export const ResponseCookiesViewer: FC<Props> = props => {
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const parsedCookies = useMemo(() => {
    return props.headers.map((h, i) => {
      let cookie: Cookie | undefined | null = null;
      try {
        cookie = h ? Cookie.parse(h.value || '', { loose: true }) : null;
      } catch (err) {
        console.warn('Failed to parse set-cookie header', h);
      }
      return { index: i, cookie, header: h };
    });
  }, [props.headers]);

  const filteredCookies = useMemo(() => {
    if (!searchFilter.trim()) {
      return parsedCookies;
    }
    
    const filter = searchFilter.toLowerCase().trim();
    return parsedCookies.filter(({ cookie }) => {
      if (!cookie) return false;
      return (
        (cookie.key && cookie.key.toLowerCase().includes(filter)) ||
        (cookie.value && cookie.value.toLowerCase().includes(filter))
      );
    });
  }, [parsedCookies, searchFilter]);

  const renderRow = (parsedCookie: { index: number, cookie: Cookie | null, header: any }) => {
    const { index, cookie } = parsedCookie;
    const blank = <span className="super-duper-faint italic">--</span>;
    return (
      <tr className="selectable" key={index}>
        <td>{cookie ? cookie.key : blank}</td>
        <td className="force-wrap">{cookie ? cookie.value : blank}</td>
      </tr>
    );
  };

  const { headers, cookiesSent, cookiesStored } = props;
  const notifyNotStored = !cookiesStored && headers.length;
  let noticeMessage: string | null = null;

  if (!cookiesSent && notifyNotStored) {
    noticeMessage = 'sending and storing';
  } else if (!cookiesSent) {
    noticeMessage = 'sending';
  } else if (notifyNotStored) {
    noticeMessage = 'storing';
  }

  return (
    <div>
      {noticeMessage && (
        <div className="notice info margin-bottom no-margin-top">
          <p>Automatic {noticeMessage} of cookies was disabled at the time this request was made</p>
        </div>
      )}

      {headers.length > 0 && (
        <div className="border-b border-solid border-[--hl-md] p-2">
          <SearchField
            aria-label="Поиск куки"
            className="group relative flex w-full"
            value={searchFilter}
            onChange={setSearchFilter}
          >
            <Input
              placeholder="Поиск по имени или значению куки..."
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
            {filteredCookies.length > 0 ? (
              filteredCookies.map(renderRow)
            ) : (
              <tr>
                <td colSpan={2} className="text-center text-[--hl] italic py-4">
                  {searchFilter ? 'Куки не найдены' : headers.length === 0 ? 'Нет куки' : '--'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {searchFilter && filteredCookies.length !== parsedCookies.length && (
        <div className="text-xs text-[--hl] p-2 border-t border-solid border-[--hl-md]">
          Показано {filteredCookies.length} из {parsedCookies.length} куки
        </div>
      )}
      
      <p className="pad-top">
        <button className="pull-right btn btn--clicky" onClick={() => setIsCookieModalOpen(true)}>
          Manage Cookies
        </button>
      </p>
      {isCookieModalOpen && <CookiesModal setIsOpen={setIsCookieModalOpen} />}
    </div>
  );
};
