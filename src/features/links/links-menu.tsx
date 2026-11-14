import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon } from 'lucide-react';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import { folderOptions } from '@/features/organization/folder-tree';

export function LinksMenu({
  side,
  pinned,
  onPin,
  bookmarks,
  folders,
  tags,
  error,
}: {
  side: 'left' | 'right';
  pinned: boolean;
  onPin: (pinned: boolean) => Promise<void>;
  bookmarks?: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  error?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [wide, setWide] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );
  const [pinError, setPinError] = useState<string>();
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const change = () => setWide(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const docked = pinned && wide;
  async function changePin(value: boolean) {
    try {
      await onPin(value);
      trigger.current?.focus();
      setPinError(undefined);
    } catch {
      setPinError('Links placement could not be saved. Try again.');
    }
  }
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState('favorites');
  const selectedFolder = selection.startsWith('folder:')
    ? selection.slice(7)
    : '';
  const filter =
    selectedFolder && !folders.some((folder) => folder.id === selectedFolder)
      ? 'all'
      : selection;
  const matches = bookmarks
    ? filterBookmarks(bookmarks, folders, tags, {
        query,
        favoritesOnly: filter === 'favorites',
        folderId: filter.startsWith('folder:')
          ? filter.slice(7)
          : filter === 'unorganized'
            ? 'unorganized'
            : '',
        tagId: '',
      })
    : [];
  return (
    <>
      <button
        type="button"
        ref={trigger}
        popoverTarget={docked ? undefined : 'home-links'}
        onClick={docked ? () => void changePin(false) : undefined}
        aria-haspopup={docked ? undefined : 'dialog'}
        aria-expanded={docked || open}
        aria-controls="home-links"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
      >
        <LinkIcon className="size-4" aria-hidden="true" />
        Links
      </button>
      {createPortal(
        <div
          id="home-links"
          ref={panel}
          popover={docked ? undefined : 'auto'}
          data-side={side}
          data-pinned={docked}
          role={docked ? 'complementary' : 'dialog'}
          aria-modal={docked ? undefined : false}
          aria-labelledby="links-title"
          className="links-panel rounded-xl border border-border bg-background p-5 text-foreground shadow-xl"
          onToggle={(event) => {
            const expanded = event.newState === 'open';
            setOpen(expanded);
            if (expanded && !docked) search.current?.focus();
          }}
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            if (target instanceof HTMLSelectElement) return;
            const links = Array.from(
              panel.current?.querySelectorAll<HTMLAnchorElement>(
                'a[data-bookmark]',
              ) ?? [],
            );
            if (
              (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
              links.length
            ) {
              event.preventDefault();
              const index = links.indexOf(target as HTMLAnchorElement);
              const next =
                index < 0
                  ? event.key === 'ArrowDown'
                    ? 0
                    : links.length - 1
                  : (index +
                      (event.key === 'ArrowDown' ? 1 : -1) +
                      links.length) %
                    links.length;
              links[next]?.focus();
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="links-title" className="text-lg font-medium">
              Links
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void changePin(!pinned)}
                className="rounded px-2 py-1 text-sm text-muted-foreground"
              >
                {pinned ? 'Unpin Links' : 'Pin Links'}
              </button>
              {!docked && (
                <button
                  type="button"
                  popoverTarget="home-links"
                  popoverTargetAction="hide"
                  className="rounded px-2 py-1 text-sm text-muted-foreground"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          {pinError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {pinError}
            </p>
          )}
          <label className="field mt-4">
            Search links
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a saved link"
            />
          </label>
          <nav
            aria-label="Link folders"
            className="mt-4 max-h-48 overflow-auto border-b border-border pb-3"
          >
            <div className="mb-2 flex flex-wrap gap-1">
              {[
                ['favorites', 'Favorites'],
                ['all', 'All bookmarks'],
                ['unorganized', 'Unorganized'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setSelection(value!)}
                  className={`rounded px-2 py-1 text-xs ${filter === value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!!folders.length && (
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                Folders
              </p>
            )}
            {folderOptions(folders).map((folder) => (
              <button
                type="button"
                key={folder.id}
                aria-pressed={filter === `folder:${folder.id}`}
                onClick={() => setSelection(`folder:${folder.id}`)}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${filter === `folder:${folder.id}` ? 'bg-secondary text-secondary-foreground' : 'hover:bg-secondary hover:text-secondary-foreground'}`}
              >
                {folder.path}
              </button>
            ))}
          </nav>
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          {!bookmarks && !error && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Loading links…
            </p>
          )}
          {bookmarks && !matches.length && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {bookmarks.length
                ? 'No matching links. Try another search or selection.'
                : 'Save bookmarks in Library to see them here.'}
            </p>
          )}
          <ul aria-label="Saved links" className="mt-4 flex flex-col gap-1">
            {matches.slice(0, 50).map((bookmark) => (
              <li key={bookmark.id}>
                <a
                  data-bookmark
                  href={bookmark.url}
                  onClick={() =>
                    panel.current?.hasAttribute('popover') &&
                    panel.current.hidePopover()
                  }
                  className="group/link block min-w-0 rounded-md px-3 py-2 hover:bg-secondary hover:text-secondary-foreground"
                >
                  <span className="block truncate text-sm font-medium">
                    {bookmark.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground group-hover/link:text-secondary-foreground">
                    {new URL(bookmark.url).hostname}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {matches.length > 50 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the first 50 matches. Refine your search or open Library.
            </p>
          )}
          <a
            href="#library"
            onClick={() =>
              panel.current?.hasAttribute('popover') &&
              panel.current.hidePopover()
            }
            className="mt-4 inline-block rounded text-sm text-primary-content underline underline-offset-4"
          >
            Open Library
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}
