import { useMemo } from 'react';
import { smartCollection } from '@/features/bookmarks/smart-collections';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import type { Bookmark } from '@/types/entities';
export function BookmarkSections({
  bookmarks,
  recent,
  frequent,
}: {
  bookmarks: Bookmark[];
  recent: boolean;
  frequent: boolean;
}) {
  const sections = useMemo(
    () => [
      ...(recent
        ? [
            {
              title: 'Recently added',
              records: smartCollection(bookmarks, 'recent').slice(0, 6),
              empty: 'Save a bookmark in Library to see it here.',
            },
          ]
        : []),
      ...(frequent
        ? [
            {
              title: 'Frequently opened',
              records: smartCollection(bookmarks, 'frequently-opened').slice(
                0,
                6,
              ),
              empty:
                'Enable open counting in Settings → Privacy, then open a bookmark from Oasis.',
            },
          ]
        : []),
    ],
    [bookmarks, recent, frequent],
  );
  if (!sections.length) return null;
  return (
    <div className="mt-6 grid w-full min-w-0 gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <section
          key={section.title}
          aria-label={section.title}
          className="min-w-0 rounded-lg border border-border bg-background p-4 text-left"
        >
          <h2 className="text-sm font-semibold">{section.title}</h2>
          {section.records.length ? (
            <ul className="mt-3 space-y-2">
              {section.records.map((bookmark) => (
                <li key={bookmark.id}>
                  <TrackedBookmarkLink
                    bookmarkId={bookmark.id}
                    href={bookmark.url}
                    className="block truncate rounded text-sm text-muted-foreground underline underline-offset-4"
                  >
                    {bookmark.title}
                  </TrackedBookmarkLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {section.empty}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
