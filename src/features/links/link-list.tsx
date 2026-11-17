import { useState, type DragEvent } from 'react';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import type { Bookmark, Tag } from '@/types/entities';
import { BookmarkIcon } from '@/features/bookmarks/bookmark-icon';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';

export function LinkList({
  bookmarks,
  tags,
  organizing,
  busy,
  onMove,
  onOpen,
}: {
  bookmarks: Bookmark[];
  tags: Tag[];
  organizing: boolean;
  busy: boolean;
  onMove: (id: string, before: string | null) => Promise<void>;
  onOpen: () => void;
}) {
  const [limit, setLimit] = useState(50);
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  function drop(event: DragEvent, before: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData('application/x-oasis-home-link');
    if (
      !busy &&
      organizing &&
      id !== before &&
      bookmarks.some((bookmark) => bookmark.id === id)
    )
      void onMove(id, before);
  }
  if (!bookmarks.length) return null;
  return (
    <>
      <ul aria-label="Saved links" className="space-y-0">
        {bookmarks.slice(0, limit).map((bookmark, index) => {
          const labels = bookmark.tags.flatMap((id) =>
            tagMap.has(id) ? [tagMap.get(id)!.name] : [],
          );
          return (
            <li
              key={bookmark.id}
              className="flex min-w-0 items-center gap-1 rounded-md hover:bg-secondary hover:text-secondary-foreground"
              onDragOver={(event) => {
                if (
                  organizing &&
                  !busy &&
                  event.dataTransfer.types.includes(
                    'application/x-oasis-home-link',
                  )
                )
                  event.preventDefault();
              }}
              onDrop={(event) => drop(event, bookmark.id)}
            >
              {organizing && (
                <span
                  draggable={!busy}
                  role="img"
                  aria-label={`Drag ${bookmark.title}`}
                  title="Drag before another link in this section"
                  className="cursor-grab p-1"
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      'application/x-oasis-home-link',
                      bookmark.id,
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <GripVertical className="size-3.5" aria-hidden="true" />
                </span>
              )}
              <TrackedBookmarkLink
                bookmarkId={bookmark.id}
                data-bookmark
                href={bookmark.url}
                onClick={onOpen}
                title={`${bookmark.title}\n${bookmark.url}${labels.length ? `\nTags: ${labels.join(', ')}` : ''}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
              >
                <BookmarkIcon bookmark={bookmark} />
                <span className="min-w-0 flex-1 truncate font-normal">
                  {bookmark.title}
                </span>
                {!!labels.length && (
                  <span className="flex max-w-[40%] min-w-0 items-center gap-1 text-[10px]">
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
              {organizing && (
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
