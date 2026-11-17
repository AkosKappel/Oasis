import { useLibraryPreferences } from '@/features/bookmarks/use-library-preferences';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon } from 'lucide-react';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { linkGroups } from './link-groups';
import { LinkList, LinkFolder } from './link-list';
import type { SmartCollection } from '@/features/bookmarks/smart-collections';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';

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
  const { preferences } = useLibraryPreferences();
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
  const [selection, setSelection] = useState<SmartCollection>('all');
  const [organizing, setOrganizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState<string>();
  const { personalBookmarks } = useSpaceRepositories();
  const historical =
    selection === 'recently-opened' || selection === 'frequently-opened';
  const groups = linkGroups(
    bookmarks ?? [],
    folders,
    tags,
    selection,
    query,
    preferences.folderOrder === 'manual',
  );
  const count = groups.reduce(
    (total, group) => total + group.bookmarks.length,
    0,
  );
  async function move(id: string, before: string | null) {
    if (busy) return;
    setBusy(true);
    setOrderError(undefined);
    try {
      await personalBookmarks.reorder(id, before);
    } catch (cause) {
      reportStorageError(cause);
      setOrderError('Link order could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }
  function closePanel() {
    if (panel.current?.hasAttribute('popover')) panel.current.hidePopover();
  }
  const listProps = {
    tags,
    organizing: organizing && !historical,
    busy,
    onMove: move,
    onOpen: closePanel,
  };
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
          className="links-panel rounded-xl border border-border bg-background p-3 text-foreground shadow-xl"
          onToggle={(event) => {
            const expanded = event.newState === 'open';
            setOpen(expanded);
            if (expanded && !docked) search.current?.focus();
          }}
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            if (
              target instanceof HTMLSelectElement ||
              target instanceof HTMLButtonElement ||
              target.tagName === 'SUMMARY'
            )
              return;
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
            aria-label="Link collections"
            className="mt-3 flex flex-wrap gap-1 border-b border-border pb-3"
          >
            {(
              [
                ['all', 'All bookmarks'],
                ['favorites', 'Favorites'],
                ['recently-opened', 'Recently visited'],
                ['frequently-opened', 'Often used'],
                ['unorganized', 'Unorganized'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={selection === value}
                onClick={() => {
                  setSelection(value);
                  setOrganizing(false);
                }}
                className={`rounded px-2 py-1 text-xs ${selection === value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          {historical && !preferences.trackOpens && (
            <p className="mt-3 text-xs text-muted-foreground">
              Open counting is off. Enable it in Settings → Privacy to build
              these collections.
            </p>
          )}
          {!historical && !!count && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={busy}
                aria-pressed={organizing}
                className="rounded px-2 py-1 text-xs text-muted-foreground underline"
                onClick={() => setOrganizing(!organizing)}
              >
                {organizing ? 'Done reordering' : 'Reorder links'}
              </button>
            </div>
          )}
          {organizing && (
            <p className="mt-2 text-xs text-muted-foreground">
              Drag links within a section or use the arrows. Order is shared
              with Library.
            </p>
          )}
          {orderError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {orderError}
            </p>
          )}
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
          {bookmarks && !count && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {bookmarks.length
                ? 'No matching links. Try another search or selection.'
                : 'Save bookmarks in Library to see them here.'}
            </p>
          )}
          <div className="mt-2 min-w-0 space-y-1" aria-busy={busy}>
            {groups.map((group) =>
              group.id ? (
                <LinkFolder
                  key={`${group.id}:${query ? 'search' : 'browse'}`}
                  name={group.name}
                  bookmarks={group.bookmarks}
                  query={query}
                  {...listProps}
                />
              ) : group.bookmarks.length ? (
                <div key="ungrouped">
                  {!historical &&
                    folders.length > 0 &&
                    selection !== 'unorganized' && (
                      <h3 className="px-2 py-2 text-xs text-muted-foreground">
                        Unorganized
                      </h3>
                    )}
                  <LinkList bookmarks={group.bookmarks} {...listProps} />
                </div>
              ) : null,
            )}
          </div>
          <a
            href="#library"
            onClick={closePanel}
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
