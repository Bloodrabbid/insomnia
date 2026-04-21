import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── helpers ──────────────────────────────────────────────────────────────────

export function buildFilteredJson(original: unknown, paths: Set<string>): unknown {
  const result: Record<string, unknown> = {};
  for (const path of paths) {
    const tokens = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let src: unknown = original;
    let dst: Record<string, unknown> = result;
    for (let i = 0; i < tokens.length; i++) {
      const key = tokens[i];
      if (src === null || typeof src !== 'object') break;
      if (i === tokens.length - 1) {
        dst[key] = (src as Record<string, unknown>)[key];
      } else {
        if (dst[key] === undefined) {
          const nextKey = tokens[i + 1];
          dst[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        dst = dst[key] as Record<string, unknown>;
        src = (src as Record<string, unknown>)[key];
      }
    }
  }
  return result;
}

function collectPaths(
  value: unknown,
  path: string,
  results: Array<{ path: string; value: unknown }>,
) {
  if (value === null || typeof value !== 'object') {
    results.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPaths(item, `${path}[${i}]`, results));
  } else {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
      collectPaths(v, path ? `${path}.${k}` : k, results),
    );
  }
}

function preview(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string')
    return value.length > 60 ? `"${value.slice(0, 60)}…"` : `"${value}"`;
  if (typeof value === 'object') return Array.isArray(value) ? '[…]' : '{…}';
  return String(value);
}

// ─── component ────────────────────────────────────────────────────────────────

interface Hit { path: string; value: unknown }

interface Props {
  bodyStr: string;
  onApply: (paths: Set<string>, label: string) => void;
  onClose: () => void;
}

export const ResponseJsonSearch: React.FC<Props> = ({ bodyStr, onApply, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    try { return JSON.parse(bodyStr); } catch { return null; }
  }, [bodyStr]);

  const allPaths = useMemo<Hit[]>(() => {
    if (!parsed) return [];
    const results: Hit[] = [];
    collectPaths(parsed, '', results);
    return results;
  }, [parsed]);

  const hits = useMemo<Hit[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allPaths.filter(
      ({ path, value }) =>
        path.toLowerCase().includes(q) || String(value).toLowerCase().includes(q),
    );
  }, [query, allPaths]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const toggle = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(hits.map(h => h.path))), [hits]);
  const clearSel  = useCallback(() => setSelected(new Set()), []);

  const applyFilter = useCallback(() => {
    if (!parsed || selected.size === 0) return;
    onApply(selected, query.trim() || 'Custom filter');
  }, [parsed, selected, query, onApply]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const renderPathSegments = (fullPath: string) => {
    // Split by dots and brackets but keep brackets in the name
    // e.g. "offers[0].tagData" -> ["offers[0]", "tagData"]
    const parts = fullPath.split(/\.(?![^\[]*\])/); 
    let currentPath = '';

    return (
      <span className="json-search__path" title={fullPath}>
        {parts.map((part, idx) => {
          currentPath = currentPath ? `${currentPath}.${part}` : part;
          const thisPath = currentPath;
          const isSel = selected.has(thisPath);
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="faint" style={{ margin: '0 2px' }}>.</span>}
              <span 
                className={`json-search__segment${isSel ? ' json-search__segment--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(thisPath);
                }}
                title={`Select entire "${thisPath}"`}
              >
                {part}
              </span>
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  if (!parsed) {
    return (
      <div className="json-search json-search--error">
        <span>Response is not valid JSON</span>
        <button className="btn btn--super-compact" onClick={onClose}>✕</button>
      </div>
    );
  }

  return (
    <div className="json-search">
      <div className="json-search__header">
        <i className="fa fa-search faint" />
        <input
          ref={inputRef}
          className="json-search__input form-control"
          placeholder="Search key or value…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="btn btn--super-compact" title="Close (Esc)" onClick={onClose}>✕</button>
      </div>

      {hits.length > 0 && (
        <div className="json-search__hits">
          <div className="json-search__hits-toolbar">
            <span className="faint">{hits.length} match{hits.length !== 1 ? 'es' : ''}</span>
            <button className="btn btn--super-compact" onClick={selectAll}>All</button>
            <button className="btn btn--super-compact" onClick={clearSel}>None</button>
            <span style={{ flex: 1 }} />
            <button
              className="btn btn--super-compact btn--outlined"
              disabled={selected.size === 0}
              onClick={applyFilter}
              title="Add these paths as a new filter chip"
            >
              <i className="fa fa-plus-circle" /> Add filter ({selected.size})
            </button>
          </div>
          <ul className="json-search__list">
            {hits.map(({ path, value }) => {
              const active = selected.has(path);
              return (
                <li
                  key={path}
                  className={`json-search__item${active ? ' json-search__item--selected' : ''}`}
                  onClick={() => toggle(path)}
                >
                  {renderPathSegments(path)}
                  <span className="json-search__value">{preview(value)}</span>
                  {active && <i className="fa fa-check json-search__check" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {query.trim() && hits.length === 0 && (
        <div className="json-search__empty faint pad-sm">No matches</div>
      )}
    </div>
  );
};
