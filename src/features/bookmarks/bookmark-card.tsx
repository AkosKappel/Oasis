import { Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Bookmark, Folder, Tag } from '@/types/entities';

interface BookmarkCardProps {
  compact?: boolean;
  bookmark: Bookmark;
  deleting: boolean;
  folder?: Folder;
  tags: Tag[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkCard({
  bookmark,
  compact = false,
  deleting,
  folder,
  tags,
  onEdit,
  onDelete,
}: BookmarkCardProps) {
  const created = new Date(bookmark.createdAt);
  const validDate = Number.isFinite(created.getTime());
  return (
    <li
      className={
        compact
          ? 'group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface/65 p-3 sm:gap-4'
          : 'group flex min-w-0 flex-col rounded-xl border border-border bg-surface/65 p-5'
      }
    >
      <div
        className={
          compact
            ? 'hidden shrink-0 flex-col items-center gap-2 sm:flex'
            : 'mb-5 flex items-center justify-between'
        }
      >
        <span
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary"
          aria-hidden="true"
        >
          {bookmark.title.slice(0, 1).toUpperCase()}
        </span>
        {bookmark.isFavorite && (
          <Star
            className="size-4 fill-primary text-primary"
            aria-label="Favorite"
            role="img"
          />
        )}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'contents'}>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-semibold hover:text-primary"
        >
          <span className="line-clamp-2 break-words">{bookmark.title}</span>
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
            {new URL(bookmark.url).hostname}
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
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
      </div>
      <div
        className={
          compact
            ? 'flex shrink-0 flex-col gap-1 sm:flex-row'
            : 'mt-auto flex justify-end gap-1 pt-5'
        }
      >
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
