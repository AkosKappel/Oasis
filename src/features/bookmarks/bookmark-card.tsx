import { useMemo, type DragEvent } from 'react';
import { safeBookmarkMedia } from '@/database/bookmark-media';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import { FileText, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Bookmark, Folder, Tag } from '@/types/entities';

interface BookmarkCardProps {
  onDragStart?: (event: DragEvent) => void;
  onDropBefore?: (event: DragEvent) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  organizingBusy?: boolean;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  bookmark: Bookmark;
  deleting: boolean;
  folder?: Folder;
  tags: Tag[];
  onEdit: (bookmark: Bookmark) => void;
  onNotes: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkCard({
  onDragStart,
  onDropBefore,
  onMoveUp,
  onMoveDown,
  organizingBusy,
  bookmark,
  compact = false,
  selected = false,
  onSelect,
  deleting,
  folder,
  tags,
  onEdit,
  onNotes,
  onDelete,
}: BookmarkCardProps) {
  const favicon = useMemo(
    () => safeBookmarkMedia(bookmark.favicon, 'icon'),
    [bookmark.favicon],
  );
  const preview = useMemo(
    () => safeBookmarkMedia(bookmark.image, 'preview'),
    [bookmark.image],
  );
  const created = new Date(bookmark.createdAt);
  const validDate = Number.isFinite(created.getTime());
  return (
    <li
      data-bookmark-id={bookmark.id}
      onDragOver={onDropBefore ? (event) => event.preventDefault() : undefined}
      onDrop={onDropBefore}
      className={
        compact
          ? 'group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface/65 p-3 sm:gap-4'
          : 'group flex min-w-0 flex-col rounded-xl border border-border bg-surface/65 p-5'
      }
    >
      <div
        className={
          compact
            ? 'flex shrink-0 flex-col items-center gap-2'
            : 'mb-5 flex items-center justify-between'
        }
      >
        {onDragStart && (
          <Button
            variant="outline"
            size="sm"
            draggable={!organizingBusy}
            disabled={organizingBusy}
            onDragStart={onDragStart}
            onClick={() => onEdit(bookmark)}
            aria-label={`Drag bookmark ${bookmark.title}`}
            title="Drag to move. Click to edit its folder."
          >
            Drag
          </Button>
        )}
        {onSelect && (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="size-4 accent-primary"
            />
            <span className="sr-only">Select {bookmark.title}</span>
          </label>
        )}
        <span
          className={`${compact ? 'hidden sm:flex' : 'flex'} relative size-10 items-center justify-center rounded-lg bg-secondary font-semibold text-secondary-foreground`}
          aria-hidden="true"
        >
          {bookmark.title.slice(0, 1).toUpperCase()}
          {favicon && (
            <img
              key={favicon}
              src={favicon}
              alt=""
              className="absolute inset-0 size-10 rounded-lg object-contain"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
        </span>
        {bookmark.isFavorite && (
          <Star
            className="size-4 fill-primary text-primary-content"
            aria-label="Favorite"
            role="img"
          />
        )}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'contents'}>
        <TrackedBookmarkLink
          bookmarkId={bookmark.id}
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-semibold hover:text-primary-content"
        >
          <span className="line-clamp-2 break-words">{bookmark.title}</span>
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
            {new URL(bookmark.url).hostname}
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedBookmarkLink>
        {!compact && preview && (
          <img
            key={preview}
            src={preview}
            alt={`Saved preview for ${bookmark.title}`}
            loading="lazy"
            decoding="async"
            className="mt-3 max-h-40 w-full rounded-lg object-cover"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        {!compact && bookmark.description && (
          <p className="mt-3 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
            {bookmark.description}
          </p>
        )}
        {(folder || tags.length > 0 || (compact && bookmark.isFavorite)) && (
          <div
            className={`${compact ? 'mt-2' : 'mt-4'} flex flex-wrap items-center gap-2 text-xs text-muted-foreground`}
          >
            {compact && bookmark.isFavorite && <span>Favorite</span>}
            {folder && (
              <span className="max-w-full break-words rounded border border-border px-2 py-1">
                {folder.name}
              </span>
            )}
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="flex max-w-full items-center gap-1 rounded-full border border-border px-2 py-1"
              >
                <span
                  className="size-2 shrink-0 rounded-full border border-black/15"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">{tag.name}</span>
              </span>
            ))}
          </div>
        )}
        {compact && (
          <p className="mt-2 text-xs text-muted-foreground">
            {validDate ? (
              <>
                Added{' '}
                <time dateTime={created.toISOString()}>
                  {created.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </>
            ) : (
              'Date unavailable'
            )}
          </p>
        )}
        {bookmark.openCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Opened {bookmark.openCount}{' '}
            {bookmark.openCount === 1 ? 'time' : 'times'}
            {bookmark.lastOpenedAt !== undefined &&
              Number.isFinite(new Date(bookmark.lastOpenedAt).getTime()) && (
                <>
                  {' '}
                  · Last opened{' '}
                  {new Date(bookmark.lastOpenedAt).toLocaleDateString()}
                </>
              )}
          </p>
        )}
      </div>
      <div
        className={
          compact
            ? 'flex shrink-0 flex-col gap-1 sm:flex-row'
            : 'mt-auto flex flex-wrap justify-end gap-1 pt-5'
        }
      >
        {onMoveUp && (
          <Button
            variant="outline"
            size="sm"
            disabled={organizingBusy}
            onClick={onMoveUp}
            aria-label={`Move up: ${bookmark.title}`}
          >
            Move up
          </Button>
        )}
        {onMoveDown && (
          <Button
            variant="outline"
            size="sm"
            disabled={organizingBusy}
            onClick={onMoveDown}
            aria-label={`Move down: ${bookmark.title}`}
          >
            Move down
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNotes(bookmark)}
          aria-label={`Notes for ${bookmark.title}`}
          title={bookmark.notes ? 'Edit notes' : 'Add notes'}
          className={bookmark.notes ? 'text-primary-content' : undefined}
        >
          <FileText className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onEdit(bookmark)}
          aria-label={`Edit ${bookmark.title}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={deleting}
          onClick={() => onDelete(bookmark)}
          aria-label={`Delete ${bookmark.title}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
