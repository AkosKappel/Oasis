import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { libraryStatistics } from './library-statistics';

export function StatisticsDialog({
  library,
  tracking,
  onClose,
}: {
  library: { bookmarks: Bookmark[]; folders: Folder[]; tags: Tag[] };
  tracking: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const stats = libraryStatistics(library);
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  const totals = [
    ['Bookmarks', stats.bookmarks],
    ['Folders', stats.folders],
    ['Tags', stats.tags],
    ['Favorites', stats.favorites],
    ['With notes', stats.notes],
    ['Unorganized', stats.unorganized],
    ['Untagged', stats.untagged],
    ['Saved opens', stats.opens],
  ] as const;
  const peak = Math.max(1, ...stats.months.map((month) => month.count));
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="statistics-title"
      className="editor !max-w-3xl"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="statistics-title" className="text-2xl font-semibold">
          Library statistics
        </h2>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Active content in this space. Deleted items are excluded. Counts update
        as your library changes.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {tracking
          ? 'Open counting is on in Settings → Privacy.'
          : 'Open counting is off. Earlier saved counts remain until you clear them in Settings → Privacy.'}{' '}
        These totals count opens made from Oasis, not general browsing activity.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="growth-title">
          <h3 id="growth-title" className="font-semibold">
            Added by month
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses saved creation dates, including imported dates. This shows
            additions still in your library, not historical deletions.
          </p>
          <ul className="mt-3 space-y-2">
            {stats.months.map((month) => (
              <li
                key={month.key}
                className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2 text-xs"
              >
                <span>{month.label}</span>
                <meter
                  aria-label={`Added in ${month.label}`}
                  min={0}
                  max={peak}
                  value={month.count}
                  className="w-full"
                />
                <span className="text-right">{month.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="hosts-title">
          <h3 id="hosts-title" className="font-semibold">
            Top hosts
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exact hostnames, with subdomains kept separate.
          </p>
          {stats.hosts.length ? (
            <ol className="mt-3 space-y-2">
              {stats.hosts.map(([host, count]) => (
                <li key={host} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 break-all">{host}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm">
              Save a bookmark to see its host here.
            </p>
          )}
        </section>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {(
          [
            [
              'tags',
              'Tag usage',
              stats.tagUsage,
              'Tag a bookmark to see it here.',
            ],
            [
              'folders',
              'Bookmarks per folder',
              stats.folderUsage,
              'Move a bookmark into a folder to see it here.',
            ],
          ] as const
        ).map(([id, title, rows, empty]) => (
          <section key={id} aria-labelledby={`${id}-usage-title`}>
            <h3 id={`${id}-usage-title`} className="font-semibold">
              {title}
            </h3>
            {rows.length ? (
              <ol className="mt-3 space-y-2">
                {rows.map(([name, count]) => (
                  <li key={name} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words">{name}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
            )}
          </section>
        ))}
      </div>
      <section className="mt-6" aria-labelledby="frequent-title">
        <h3 id="frequent-title" className="font-semibold">
          Most opened
        </h3>
        {stats.frequent.length ? (
          <ol className="mt-3 space-y-2">
            {stats.frequent.map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <TrackedBookmarkLink
                  bookmarkId={bookmark.id}
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-words underline"
                >
                  {bookmark.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </TrackedBookmarkLink>
                <span className="shrink-0">{bookmark.openCount} opens</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Enable open counting in Settings → Privacy and open a saved bookmark
            to build this list.
          </p>
        )}
      </section>
    </dialog>
  );
}
