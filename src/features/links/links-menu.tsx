import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon } from 'lucide-react';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import { folderOptions } from '@/features/organization/folder-tree';

export function LinksMenu({
  bookmarks,
  folders,
  tags,
  error,
}: {
  bookmarks?: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  error?: string;
}) {
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
        popoverTarget="home-links"
        aria-haspopup="dialog"
        aria-expanded={open}
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
          popover="auto"
          role="dialog"
          aria-modal="false"
          aria-labelledby="links-title"
          className="links-panel rounded-xl border border-border bg-background p-5 text-foreground shadow-xl"
          onToggle={(event) => {
            const expanded = event.newState === 'open';
            setOpen(expanded);
            if (expanded) search.current?.focus();
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
            <button
              type="button"
              popoverTarget="home-links"
              popoverTargetAction="hide"
              className="rounded px-2 py-1 text-sm text-muted-foreground"
            >
              Close
            </button>
          </div>
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
          <label className="field mt-3">
            Show links
            <select
              value={filter}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="favorites">Favorites</option>
              <option value="all">All bookmarks</option>
              <option value="unorganized">Unorganized</option>
              {folderOptions(folders).map((folder) => (
                <option key={folder.id} value={`folder:${folder.id}`}>
                  {folder.path}
                </option>
              ))}
            </select>
          </label>
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
                  onClick={() => panel.current?.hidePopover()}
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
            onClick={() => panel.current?.hidePopover()}
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
