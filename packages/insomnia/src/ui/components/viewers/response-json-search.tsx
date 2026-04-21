import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Recursively walk a JSON value and collect every leaf path + value */
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

/** Build a new object containing only the selected dot-bracket paths */
function buildFilteredJson(
  original: unknown,
  paths: Set<string>,
): unknown {
  const result: Record<string, unknown> = {};

  for (const path of paths) {
    // split path into tokens: "offers[0].offerType" → ["offers", "0", "offerType"]
    const tokens = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let src: unknown = original;
    let dst: Record<string, unknown> = result;

    for (let i = 0; i < tokens.length; i++) {
      const key = tokens[i];
      if (src === null || typeof src !== 'object') break;

      if (i === tokens.length - 1) {
        // leaf – assign
        dst[key] = (src as Record<string, unknown>)[key];
      } else {
        // node – ensure container exists
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

/** Pretty-print a value for display in the dropdown */
function preview(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length > 60 ? `"${value.slice(0, 60)}…"` : `"${value}"`;
  }
  if (typeof value === 'object') return Array.isArray(value) ? '[…]' : '{…}';
  return String(value);
}

// ─── component ────────────────────────────────────────────────────────────────

interface Hit {
  path: string;
  value: unknown;
}

interface Props {
  /** Raw JSON string (already decoded, not yet parsed) */
  bodyStr: string;
  onClose: () => void;
}

export const ResponseJsonSearch: React.FC<Props> = ({ bodyStr, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filteredOutput, setFilteredOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse JSON once
  const parsed = useMemo(() => {
    try {
      return JSON.parse(bodyStr);
    } catch {
      return null;
    }
  }, [bodyStr]);

  // All leaf paths
  const allPaths = useMemo<Hit[]>(() => {
    if (!parsed) return [];
    const results: Hit[] = [];
    collectPaths(parsed, '', results);
    return results;
  }, [parsed]);

  // Filtered hits by query
  const hits = useMemo<Hit[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allPaths.filter(
      ({ path, value }) =>
        path.toLowerCase().includes(q) ||
        String(value).toLowerCase().includes(q),
    );
  }, [query, allPaths]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggle = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
    setFilteredOutput(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(hits.map(h => h.path)));
    setFilteredOutput(null);
  }, [hits]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setFilteredOutput(null);
  }, []);

  const applyFilter = useCallback(() => {
    if (!parsed || selected.size === 0) return;
    const filtered = buildFilteredJson(parsed, selected);
    setFilteredOutput(JSON.stringify(filtered, null, 2));
  }, [parsed, selected]);

  const copyOutput = useCallback(() => {
    if (!filteredOutput) return;
    navigator.clipboard.writeText(filteredOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [filteredOutput]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
      {/* ── header ── */}
      <div className="json-search__header">
        <input
          ref={inputRef}
          className="json-search__input form-control"
          placeholder="Search key or value…"
          value={query}
          onChange={e => { setQuery(e.target.value); setFilteredOutput(null); }}
        />
        <button className="btn btn--super-compact" title="Close (Esc)" onClick={onClose}>✕</button>
      </div>

      {/* ── hits list ── */}
      {hits.length > 0 && (
        <div className="json-search__hits">
          <div className="json-search__hits-toolbar">
            <span className="faint">{hits.length} matches</span>
            <button className="btn btn--super-compact" onClick={selectAll}>Select all</button>
            <button className="btn btn--super-compact" onClick={clearSelection}>Clear</button>
            <button
              className="btn btn--super-compact btn--outlined"
              disabled={selected.size === 0}
              onClick={applyFilter}
            >
              Apply ({selected.size})
            </button>
          </div>

          <ul className="json-search__list">
            {hits.map(({ path, value }) => {
              const isSelected = selected.has(path);
              return (
                <li
                  key={path}
                  className={`json-search__item${isSelected ? ' json-search__item--selected' : ''}`}
                  onClick={() => toggle(path)}
                >
                  <span className="json-search__path">{path || '(root)'}</span>
                  <span className="json-search__value">{preview(value)}</span>
                  {isSelected && <i className="fa fa-check json-search__check" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {query && hits.length === 0 && (
        <div className="json-search__empty faint pad-sm">No matches</div>
      )}

      {/* ── filtered output ── */}
      {filteredOutput && (
        <div className="json-search__output">
          <div className="json-search__output-toolbar">
            <span className="faint">Filtered result</span>
            <button className="btn btn--super-compact" onClick={copyOutput}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button className="btn btn--super-compact" onClick={() => setFilteredOutput(null)}>✕</button>
          </div>
          <pre className="json-search__pre">{filteredOutput}</pre>
        </div>
      )}
    </div>
  );
};
