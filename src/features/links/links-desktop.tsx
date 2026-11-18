import { useEffect, useMemo, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Folder as FolderIcon,
  X,
} from 'lucide-react';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { Button } from '@/components/ui/button';
import { BookmarkIcon } from '@/features/bookmarks/bookmark-icon';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import { useLibraryPreferences } from '@/features/bookmarks/use-library-preferences';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import {
  DESKTOP_COLUMNS,
  DESKTOP_ROWS,
  type DesktopItem,
} from '@/database/desktop';
import { linkGroups, type LinkFolderNode } from './link-groups';
import { LinkTiles } from './link-tiles';

const DRAG_TYPE = 'application/x-oasis-desktop-item';
const tileClass =
  'flex w-full min-w-0 flex-1 flex-col items-center gap-1 rounded-md p-2 text-center text-xs hover:bg-secondary hover:text-secondary-foreground';

function useWideScreen() {
  const query = '(min-width: 640px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = () => setWide(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return wide;
}

export function LinksDesktop({
  bookmarks,
  folders,
  tags,
}: {
  bookmarks: Bookmark[];
  folders: Folder[];
  tags: Tag[];
}) {
  const { desktop } = useSpaceRepositories();
  const { preferences } = useLibraryPreferences();
  const wide = useWideScreen();
  const [items, setItems] = useState<DesktopItem[]>();
  const [arranging, setArranging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [openFolder, setOpenFolder] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => desktop.list()).subscribe({
      next: setItems,
      error: (cause) => {
        reportStorageError(cause, true);
        setError('The desktop could not be loaded. Use Retry storage.');
      },
    });
    return () => subscription.unsubscribe();
  }, [desktop]);
  const bookmarkMap = useMemo(
    () => new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark])),
    [bookmarks],
  );
  const folderNodes = useMemo(() => {
    const groups = linkGroups(
      bookmarks,
      folders,
      tags,
      '',
      '',
      preferences.folderOrder === 'manual',
    );
    const nodes = new Map<string, LinkFolderNode>();
    const pending = [...groups.folders];
    while (pending.length) {
      const node = pending.pop()!;
      nodes.set(node.id, node);
      pending.push(...node.children);
    }
    return nodes;
  }, [bookmarks, folders, tags, preferences.folderOrder]);
  async function act(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The desktop could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!items) return null;
  const placed = new Set(items.map((item) => item.targetId));
  const cells = new Map(
    items.map((item) => [`${item.column}:${item.row}`, item]),
  );
  const canArrange = arranging && wide;
  const rows = canArrange
    ? DESKTOP_ROWS
    : Math.max(0, ...items.map((item) => item.row + 1));
  const ordered = [...items].sort(
    (a, b) => a.row - b.row || a.column - b.column,
  );
  const needle = query.trim().toLowerCase();
  const candidates = needle
    ? [
        ...[...folderNodes.values()]
          .filter(
            (node) =>
              !placed.has(node.id) && node.name.toLowerCase().includes(needle),
          )
          .slice(0, 4)
          .map((node) => ({
            kind: 'folder' as const,
            id: node.id,
            label: node.name,
          })),
        ...filterBookmarks(bookmarks, folders, tags, {
          query,
          favoritesOnly: false,
          folderId: '',
          tagId: '',
        })
          .filter((bookmark) => !placed.has(bookmark.id))
          .slice(0, 6)
          .map((bookmark) => ({
            kind: 'bookmark' as const,
            id: bookmark.id,
            label: bookmark.title,
          })),
      ]
    : [];
  function label(item: DesktopItem) {
    return item.kind === 'bookmark'
      ? (bookmarkMap.get(item.targetId)?.title ?? 'Unavailable link')
      : (folderNodes.get(item.targetId)?.name ?? 'Unavailable folder');
  }
  function tile(item: DesktopItem) {
    const bookmark =
      item.kind === 'bookmark' ? bookmarkMap.get(item.targetId) : undefined;
    const folder =
      item.kind === 'folder' ? folderNodes.get(item.targetId) : undefined;
    if (!bookmark && !folder)
      return canArrange ? (
        <span className={`${tileClass} opacity-60`}>{label(item)}</span>
      ) : null;
    return bookmark ? (
      <TrackedBookmarkLink
        bookmarkId={bookmark.id}
        href={bookmark.url}
        title={`${bookmark.title}\n${bookmark.url}`}
        className={tileClass}
        draggable={canArrange ? true : undefined}
        onDragStart={(event) => {
          if (!canArrange) return;
          event.dataTransfer.setData(DRAG_TYPE, item.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onClick={(event) => {
          if (canArrange) event.preventDefault();
        }}
      >
        <BookmarkIcon bookmark={bookmark} large />
        <span className="line-clamp-2 w-full break-words">
          {bookmark.title}
        </span>
        <span className="sr-only">{bookmark.url}</span>
      </TrackedBookmarkLink>
    ) : (
      <button
        type="button"
        title={folder!.name}
        aria-label={`Open ${folder!.name}, ${folder!.count} ${folder!.count === 1 ? 'link' : 'links'}`}
        className={tileClass}
        draggable={canArrange ? true : undefined}
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, item.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => !canArrange && setOpenFolder(folder!.id)}
      >
        <span className="flex size-10 items-center justify-center">
          {folder!.icon ? (
            <span className="text-3xl">{folder!.icon}</span>
          ) : (
            <FolderIcon className="size-8" aria-hidden="true" />
          )}
        </span>
        <span className="line-clamp-2 w-full break-words">{folder!.name}</span>
      </button>
    );
  }
  function controls(item: DesktopItem) {
    const name = label(item);
    const moves = [
      ['left', ArrowLeft, item.column - 1, item.row],
      ['up', ArrowUp, item.column, item.row - 1],
      ['down', ArrowDown, item.column, item.row + 1],
      ['right', ArrowRight, item.column + 1, item.row],
    ] as const;
    return (
      <span className="flex flex-wrap justify-center">
        {moves.map(([direction, Icon, column, row]) => (
          <button
            key={direction}
            type="button"
            aria-label={`Move ${name} ${direction}`}
            disabled={
              busy ||
              column < 0 ||
              row < 0 ||
              column >= DESKTOP_COLUMNS ||
              row >= DESKTOP_ROWS
            }
            className="rounded p-0.5 disabled:opacity-30"
            onClick={() => void act(() => desktop.move(item.id, column, row))}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          aria-label={`Remove ${name} from desktop`}
          disabled={busy}
          className="rounded p-0.5"
          onClick={() => void act(() => desktop.remove(item.id))}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    );
  }
  const node = openFolder ? folderNodes.get(openFolder) : undefined;
  return (
    <section aria-label="Links desktop" className="w-full">
      {(arranging || !items.length) && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          {!items.length && !arranging && (
            <p className="text-sm text-muted-foreground">
              Place links and folders on your desktop.
            </p>
          )}
          {arranging && (
            <div className="w-full max-w-sm text-left">
              <label className="field text-sm">
                Find a link or folder to add
                <input
                  type="search"
                  value={query}
                  disabled={busy}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {!!candidates.length && (
                <ul
                  aria-label="Items to add"
                  className="mt-2 space-y-1 rounded-md border border-border bg-background p-1 text-foreground"
                >
                  {candidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate px-1">
                        {candidate.kind === 'folder' ? 'Folder: ' : ''}
                        {candidate.label}
                      </span>
                      <Button
                        variant="outline"
                        disabled={busy}
                        aria-label={`Add ${candidate.label} to desktop`}
                        onClick={() =>
                          void act(async () => {
                            await desktop.add(candidate.kind, candidate.id);
                            setQuery('');
                          })
                        }
                      >
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {needle && !candidates.length && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No matching links or folders to add.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mb-2 text-sm">
          {error}
        </p>
      )}
      {wide ? (
        !!rows && (
          <ol
            aria-label="Desktop places"
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${DESKTOP_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: rows * DESKTOP_COLUMNS }, (_, index) => {
              const column = index % DESKTOP_COLUMNS,
                row = Math.floor(index / DESKTOP_COLUMNS);
              const item = cells.get(`${column}:${row}`);
              if (!item && !canArrange)
                return <li key={index} aria-hidden="true" />;
              return (
                <li
                  key={index}
                  data-cell={`${column}:${row}`}
                  aria-label={item ? undefined : 'Empty place'}
                  className={`flex min-h-24 min-w-0 flex-col rounded-md ${canArrange ? 'border border-dashed border-border/60' : ''}`}
                  onDragOver={(event) => {
                    if (
                      canArrange &&
                      event.dataTransfer.types.includes(DRAG_TYPE)
                    )
                      event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData(DRAG_TYPE);
                    if (canArrange && id && id !== item?.id)
                      void act(() => desktop.move(id, column, row));
                  }}
                >
                  {item && tile(item)}
                  {item && canArrange && controls(item)}
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <ul
          aria-label="Desktop places"
          className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1"
        >
          {ordered.map((item) => (
            <li key={item.id} className="min-w-0">
              {tile(item)}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex justify-center">
        {wide ? (
          <button
            type="button"
            aria-pressed={arranging}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setArranging(!arranging);
              setQuery('');
            }}
          >
            {arranging ? 'Done arranging' : 'Arrange desktop'}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Open Oasis in a wider window to arrange the desktop.
          </p>
        )}
      </div>
      {node && (
        <FolderWindow
          node={node}
          tags={tags}
          onClose={() => setOpenFolder(undefined)}
        />
      )}
    </section>
  );
}

function FolderWindow({
  node,
  tags,
  onClose,
}: {
  node: LinkFolderNode;
  tags: Tag[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="editor text-left"
      aria-labelledby="desktop-folder-title"
      onClose={onClose}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="desktop-folder-title" className="text-lg font-semibold">
          {node.name}
        </h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
      <LinkTiles
        rootName={node.name}
        folders={node.children}
        unorganized={node.bookmarks}
        sections={[]}
        tags={tags}
        organizing={false}
        busy={false}
        onMove={async () => undefined}
        onOpen={onClose}
      />
    </dialog>
  );
}
