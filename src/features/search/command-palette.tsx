import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import {
  searchEngine,
  webSearchUrl,
  type SearchEngine,
} from '@/lib/search-engines';
import { useEffect, useRef, useState } from 'react';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import { useLibrary } from '@/features/bookmarks/use-library';

export function CommandPalette({
  initialQuery,
  preferredEngine,
  onClose,
}: {
  initialQuery: string;
  preferredEngine?: SearchEngine;
  onClose: () => void;
}) {
  const { openHistory } = useSpaceRepositories();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const { library, error } = useLibrary();
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    dialog.current?.querySelector('input')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const bookmarks = library
    ? filterBookmarks(library.bookmarks, library.folders, library.tags, {
        query,
        favoritesOnly: false,
        folderId: '',
        tagId: '',
      }).slice(0, 20)
    : [];
  const actions = [
    { id: 'home', title: 'Go to Home', url: '#' },
    { id: 'library', title: 'Go to Library', url: '#library' },
  ].filter((action) =>
    action.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const webUrl = webSearchUrl(preferredEngine, query);
  const source = searchEngine(preferredEngine);
  const results = [
    ...bookmarks,
    ...actions,
    ...(webUrl
      ? [
          {
            id: 'web-search',
            title: `Search ${source.name} for “${query.trim()}”`,
            url: webUrl,
          },
        ]
      : []),
  ];
  const active = Math.min(selected, Math.max(0, results.length - 1));
  useEffect(() => {
    document
      .getElementById(`search-result-${active}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  function open(index: number) {
    const result = results[index];
    if (!result) return;
    const tracking =
      'spaceId' in result ? openHistory.record(result.id) : Promise.resolve();
    void tracking.catch(reportStorageError).then(() => {
      window.location.assign(result.url);
      onClose();
    });
  }
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="search-title"
      className="editor"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="search-title" className="text-lg font-medium">
          Search Oasis
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-muted-foreground"
        >
          Close
        </button>
      </div>
      <label className="field mt-5">
        <span className="sr-only">Search bookmarks and actions</span>
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={
            results.length ? `search-result-${active}` : undefined
          }
          value={query}
          maxLength={2000}
          placeholder="Search bookmarks and actions"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected(
                (active +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  results.length) %
                  (results.length || 1),
              );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              open(active);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      {!library && !error && (
        <p role="status" className="mt-4 text-sm">
          Loading bookmarks…
        </p>
      )}
      <ul
        id="search-results"
        role="listbox"
        aria-label="Search results"
        className="mt-4 max-h-80 overflow-y-auto"
      >
        {results.map((result, index) => (
          <li
            key={result.id}
            id={`search-result-${index}`}
            role="option"
            aria-selected={active === index}
            className={`cursor-pointer rounded-lg px-3 py-3 ${active === index ? 'bg-secondary text-secondary-foreground' : ''}`}
            onClick={() => open(index)}
          >
            <span className="block truncate text-sm font-medium">
              {result.title}
            </span>
            <span
              className={`block truncate text-xs ${active === index ? 'text-secondary-foreground' : 'text-muted-foreground'}`}
            >
              {result.url.startsWith('#')
                ? 'Navigation'
                : new URL(result.url).hostname}
            </span>
          </li>
        ))}
      </ul>
      {library && !results.length && (
        <p
          role="status"
          className="py-6 text-center text-sm text-muted-foreground"
        >
          No matching bookmarks or actions.
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Try tag:reading, folder:work, domain:example.com or is:favorite.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        ↑ ↓ to select · Enter to open · Esc to close
      </p>
    </dialog>
  );
}
