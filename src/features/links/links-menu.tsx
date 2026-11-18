import { useLibraryPreferences } from '@/features/bookmarks/use-library-preferences';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Link as LinkIcon,
  Pin,
  PinOff,
  X,
  ArrowUpDown,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import { BookmarkEditor } from '@/features/bookmarks/bookmark-editor';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { linkGroups } from './link-groups';
import { LinkList } from './link-list';
import { LinkTiles } from './link-tiles';
import { LinkFolder, LinkSection } from './link-section';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';

const LINKS_OPEN_KEY = 'oasis:links-open';

export function LinksMenu({
  sections,
  side,
  pinned,
  onPin,
  bookmarks,
  folders,
  tags,
  error,
}: {
  sections: { favorites: boolean; recent: boolean; frequent: boolean };
  side: 'left' | 'right';
  pinned: boolean;
  onPin: (pinned: boolean) => Promise<void>;
  bookmarks?: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  error?: string;
}) {
  const { preferences } = useLibraryPreferences();
  const tiles = preferences.linksView === 'tiles';
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
  // Opened by hover or restored from the last tab: do not move focus into the panel.
  const quiet = useRef(false);
  // Closing because a link was opened keeps the panel remembered as open.
  const keepRemembered = useRef(false);
  const hoverTimer = useRef<number>(undefined);
  // A click right after hover opened the panel keeps it open instead of toggling it shut.
  const hoverOpened = useRef(false);
  function showQuietly() {
    const element = panel.current;
    if (!element?.hasAttribute('popover') || element.matches(':popover-open'))
      return;
    quiet.current = true;
    element.showPopover();
  }
  useEffect(() => {
    if (docked) return;
    try {
      if (localStorage.getItem(LINKS_OPEN_KEY) === 'true') showQuietly();
    } catch {
      // Storage blocked: the panel starts closed.
    }
  }, [docked]);
  const [query, setQuery] = useState('');
  const [tagId, setTagId] = useState('');
  const activeTag = tags.some((tag) => tag.id === tagId) ? tagId : '';
  const filtering = !!query.trim() || !!activeTag;
  const [organizing, setOrganizing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState<string>();
  const { personalBookmarks, personalLibraryPreferences } =
    useSpaceRepositories();
  const groups = linkGroups(
    bookmarks ?? [],
    folders,
    tags,
    query,
    activeTag,
    preferences.folderOrder === 'manual',
  );
  const count = groups.count;
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
  async function changeView() {
    setOrderError(undefined);
    try {
      await personalLibraryPreferences.save({
        linksView: tiles ? 'list' : 'tiles',
      });
    } catch (cause) {
      reportStorageError(cause);
      setOrderError('Links view could not be saved. Try again.');
    }
  }
  function closePanel() {
    if (panel.current?.hasAttribute('popover')) panel.current.hidePopover();
  }
  function openedLink() {
    keepRemembered.current = true;
    closePanel();
    keepRemembered.current = false;
  }
  const listProps = {
    tags,
    organizing,
    busy,
    onMove: move,
    onOpen: openedLink,
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
        onPointerEnter={(event) => {
          if (docked || event.pointerType !== 'mouse') return;
          hoverTimer.current = window.setTimeout(() => {
            if (panel.current?.matches(':popover-open')) return;
            showQuietly();
            hoverOpened.current = true;
          }, 200);
        }}
        onPointerLeave={() => window.clearTimeout(hoverTimer.current)}
        onClickCapture={(event) => {
          window.clearTimeout(hoverTimer.current);
          if (!hoverOpened.current) return;
          hoverOpened.current = false;
          event.preventDefault();
          search.current?.focus();
        }}
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
          className="links-panel rounded-lg border border-border/50 bg-background p-2 text-foreground shadow-xl"
          onToggle={(event) => {
            if (event.target !== event.currentTarget) return;
            const expanded = event.newState === 'open';
            setOpen(expanded);
            if (expanded && !docked && !quiet.current) search.current?.focus();
            quiet.current = false;
            if (!expanded) hoverOpened.current = false;
            if (!docked && (expanded || !keepRemembered.current))
              try {
                localStorage.setItem(LINKS_OPEN_KEY, String(expanded));
              } catch {
                // Storage blocked: the panel is not remembered.
              }
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
            ).filter((link) => link.getClientRects().length > 0);
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
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <h2 id="links-title" className="text-sm font-semibold">
              Links
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!bookmarks}
                onClick={() => {
                  closePanel();
                  setAdding(true);
                }}
                aria-label="Add link"
                title="Add link"
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void changePin(!pinned)}
                aria-label={pinned ? 'Unpin Links' : 'Pin Links'}
                title={pinned ? 'Unpin Links' : 'Pin Links'}
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              >
                {pinned ? (
                  <PinOff className="size-4" aria-hidden="true" />
                ) : (
                  <Pin className="size-4" aria-hidden="true" />
                )}
              </button>
              {!docked && (
                <button
                  type="button"
                  popoverTarget="home-links"
                  popoverTargetAction="hide"
                  aria-label="Close"
                  title="Close"
                  className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {pinError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {pinError}
            </p>
          )}
          <div className="my-2 flex min-w-0 items-center gap-1 px-1">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search links</span>
              <input
                ref={search}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search links"
                className="w-full min-w-0 rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
              />
            </label>
            <label className="min-w-0 max-w-[42%]">
              <span className="sr-only">Filter by tag</span>
              <select
                value={activeTag}
                onChange={(event) => setTagId(event.target.value)}
                className="w-full min-w-0 truncate rounded-md border border-border bg-background px-1 py-1.5 text-xs"
              >
                <option value="">All tags</option>
                {[...tags]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="Show links as tiles"
              title="Show links as tiles"
              aria-pressed={tiles}
              className="shrink-0 rounded p-1.5 hover:bg-secondary hover:text-secondary-foreground"
              onClick={() => void changeView()}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
            </button>
            {!!count && (
              <button
                type="button"
                disabled={busy}
                aria-label={organizing ? 'Done reordering' : 'Reorder links'}
                title={organizing ? 'Done reordering' : 'Reorder links'}
                aria-pressed={organizing}
                className="shrink-0 rounded p-1.5 hover:bg-secondary hover:text-secondary-foreground"
                onClick={() => setOrganizing(!organizing)}
              >
                <ArrowUpDown className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
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
                ? 'No matching links. Try another search or tag.'
                : 'Save bookmarks in Library to see them here.'}
            </p>
          )}
          {tiles && !!count && (
            <div className="min-w-0" aria-busy={busy}>
              <LinkTiles
                {...listProps}
                folders={groups.folders}
                unorganized={groups.unorganized}
                results={filtering ? groups.ordered : undefined}
                sections={(
                  [
                    ['favorites', 'Favorites', groups.favorites],
                    ['recent', 'Recently used', groups.recent],
                    ['frequent', 'Frequently used', groups.frequent],
                  ] as const
                ).flatMap(([id, name, records]) =>
                  sections[id] ? [{ id, name, bookmarks: [...records] }] : [],
                )}
              />
            </div>
          )}
          {!tiles && (
            <div className="min-w-0" aria-busy={busy}>
              {(
                [
                  ['favorites', 'Favorites', groups.favorites],
                  ['recent', 'Recently used', groups.recent],
                  ['frequent', 'Frequently used', groups.frequent],
                ] as const
              ).map(
                ([id, name, records]) =>
                  sections[id] && (
                    <LinkSection
                      key={`${id}:${filtering}`}
                      name={name}
                      icon={id}
                      count={records.length}
                      expanded={filtering}
                    >
                      <div className="ml-3 border-l border-border/40 pl-1">
                        <LinkList
                          {...listProps}
                          organizing={false}
                          bookmarks={[...records]}
                        />
                        {!records.length && (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            {id !== 'favorites' && !preferences.trackOpens
                              ? 'Enable open counting in Settings → Privacy.'
                              : 'No matching links in this section.'}
                          </p>
                        )}
                      </div>
                    </LinkSection>
                  ),
              )}
              {(sections.favorites || sections.recent || sections.frequent) && (
                <div className="mx-2 my-2 border-t border-border/60" />
              )}
              {groups.folders.map((node) => (
                <LinkFolder
                  key={`${node.id}:${filtering}`}
                  node={node}
                  filtering={filtering}
                  {...listProps}
                />
              ))}
              <LinkList {...listProps} bookmarks={groups.unorganized} />
            </div>
          )}
          <a
            href="#library"
            onClick={openedLink}
            className="mx-2 mt-3 inline-block rounded text-xs text-muted-foreground hover:text-foreground"
          >
            Open Library
          </a>
        </div>,
        document.body,
      )}
      {adding && (
        <BookmarkEditor
          folders={folders}
          tags={tags}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}
