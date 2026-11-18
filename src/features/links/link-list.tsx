import { useRef, useState, type DragEvent } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import type { Bookmark, Tag } from '@/types/entities';
import { BookmarkIcon } from '@/features/bookmarks/bookmark-icon';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';

export const LINK_DRAG_TYPE = 'application/x-oasis-home-link';

export interface LinkActions {
  onEdit?: (bookmark: Bookmark) => void;
  onDelete?: (bookmark: Bookmark) => void;
  onFavorite?: (bookmark: Bookmark) => void;
}

export function LinkList({
  bookmarks,
  tags,
  organizing,
  busy,
  onMove,
  onOpen,
  folderId,
  onEdit,
  onDelete,
  onFavorite,
}: {
  bookmarks: Bookmark[];
  tags: Tag[];
  organizing: boolean;
  busy: boolean;
  onMove: (
    id: string,
    before: string | null,
    folderId?: string | null,
  ) => Promise<void>;
  onOpen: () => void;
  /** Set for folder lists (null for links without a folder): links dragged from elsewhere move here. */
  folderId?: string | null;
} & LinkActions) {
  const accepts = folderId !== undefined;
  const [limit, setLimit] = useState(50);
  // Where a dragged link would land: before or after this row.
  const [target, setTarget] = useState<{ id: string; after: boolean }>();
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const visible = bookmarks.slice(0, limit);
  function drop(event: DragEvent, index: number) {
    const id = event.dataTransfer.getData(LINK_DRAG_TYPE);
    const after = target?.after ?? false;
    setTarget(undefined);
    if (!id || busy) return;
    event.preventDefault();
    const before = after
      ? (visible[index + 1]?.id ?? null)
      : visible[index]!.id;
    if (before === id) return;
    if (accepts) void onMove(id, before, folderId);
    // Derived sections (favorites, recent) only reorder links already in them.
    else if (bookmarks.some((bookmark) => bookmark.id === id))
      void onMove(id, before);
  }
  if (!bookmarks.length) return null;
  return (
    <>
      <ul aria-label="Saved links" className="space-y-0">
        {visible.map((bookmark, index) => {
          const labels = bookmark.tags.flatMap((id) =>
            tagMap.has(id) ? [tagMap.get(id)!.name] : [],
          );
          const marker =
            target?.id === bookmark.id
              ? target.after
                ? 'shadow-[inset_0_-2px_0_var(--ring)]'
                : 'shadow-[inset_0_2px_0_var(--ring)]'
              : '';
          return (
            <li
              key={bookmark.id}
              className={`group/link relative flex min-w-0 items-center gap-1 rounded-md hover:bg-secondary hover:text-secondary-foreground ${marker}`}
              onDragOver={(event) => {
                if (busy || !event.dataTransfer.types.includes(LINK_DRAG_TYPE))
                  return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                const rect = event.currentTarget.getBoundingClientRect();
                const after = event.clientY > rect.top + rect.height / 2;
                if (target?.id !== bookmark.id || target.after !== after)
                  setTarget({ id: bookmark.id, after });
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setTarget(undefined);
              }}
              onDrop={(event) => drop(event, index)}
            >
              <TrackedBookmarkLink
                bookmarkId={bookmark.id}
                data-bookmark
                href={bookmark.url}
                onClick={onOpen}
                onDragStart={(event) => {
                  // The browser keeps the URL for dropping outside; Oasis adds the ID for moving.
                  if (busy) return;
                  event.dataTransfer.setData(LINK_DRAG_TYPE, bookmark.id);
                  event.dataTransfer.effectAllowed = 'copyMove';
                }}
                onDragEnd={() => setTarget(undefined)}
                title={`${bookmark.title}\n${bookmark.url}${labels.length ? `\nTags: ${labels.join(', ')}` : ''}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
              >
                <BookmarkIcon bookmark={bookmark} />
                <span className="min-w-0 flex-1 truncate font-normal">
                  {bookmark.title}
                </span>
                {!!labels.length && (
                  <span className="flex max-w-[40%] min-w-0 items-center gap-1 text-[10px] group-hover/link:hidden group-focus-within/link:hidden">
                    <span className="max-w-20 truncate rounded border border-border px-1">
                      {labels[0]}
                    </span>
                    {labels.length > 1 && (
                      <span className="shrink-0">+{labels.length - 1}</span>
                    )}
                  </span>
                )}
                <span className="sr-only">
                  {bookmark.url}
                  {labels.length ? `, tags: ${labels.join(', ')}` : ''}
                </span>
              </TrackedBookmarkLink>
              {organizing ? (
                <span className="flex shrink-0">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Move ${bookmark.title} up`}
                    className="rounded p-1.5 disabled:opacity-30"
                    onClick={() =>
                      void onMove(bookmark.id, bookmarks[index - 1]!.id)
                    }
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === bookmarks.length - 1}
                    aria-label={`Move ${bookmark.title} down`}
                    className="rounded p-1.5 disabled:opacity-30"
                    onClick={() =>
                      void onMove(bookmark.id, bookmarks[index + 2]?.id ?? null)
                    }
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                onEdit && (
                  <LinkMenu
                    bookmark={bookmark}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onFavorite={onFavorite}
                  />
                )
              )}
            </li>
          );
        })}
      </ul>
      {bookmarks.length > limit && (
        <button
          type="button"
          className="mt-2 rounded px-2 py-1 text-xs underline"
          onClick={() => setLimit(limit + 50)}
        >
          Show more links ({bookmarks.length - limit} remaining)
        </button>
      )}
    </>
  );
}

const itemClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary hover:text-secondary-foreground';

/** The ⋯ menu that appears on a hovered or focused link row. */
function LinkMenu({
  bookmark,
  onEdit,
  onDelete,
  onFavorite,
}: { bookmark: Bookmark } & LinkActions) {
  const menu = useRef<HTMLDivElement>(null);
  const id = `link-menu-${bookmark.id}`;
  function run(action: () => void) {
    menu.current?.hidePopover();
    action();
  }
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`More actions for ${bookmark.title}`}
        title="More actions"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const element = menu.current;
          if (!element) return;
          element.style.top = `${Math.min(rect.bottom + 4, innerHeight - 230)}px`;
          element.style.left = `${Math.max(8, Math.min(rect.right - 208, innerWidth - 216))}px`;
        }}
        className="mr-1 shrink-0 rounded p-1 opacity-0 group-hover/link:opacity-100 group-focus-within/link:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="menu"
        aria-label={`Actions for ${bookmark.title}`}
        className="glass-panel m-0 w-52 rounded-lg border border-border bg-background p-1 text-foreground shadow-xl"
        style={{ position: 'fixed', right: 'auto', bottom: 'auto' }}
      >
        <a
          role="menuitem"
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={itemClass}
          onClick={() => menu.current?.hidePopover()}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Open in new tab
        </a>
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          onClick={() => run(() => onEdit?.(bookmark))}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </button>
        {onFavorite && (
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => run(() => onFavorite(bookmark))}
          >
            {bookmark.isFavorite ? (
              <StarOff className="size-4" aria-hidden="true" />
            ) : (
              <Star className="size-4" aria-hidden="true" />
            )}
            {bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          onClick={() =>
            run(() => void navigator.clipboard?.writeText(bookmark.url))
          }
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy link
        </button>
        {onDelete && (
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-danger`}
            onClick={() => run(() => onDelete(bookmark))}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </>
  );
}
