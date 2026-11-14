import type { Bookmark } from '@/types/entities';
import type { LibraryPreferences } from '@/database/library-preferences';
const names = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
export function sortBookmarks(
  bookmarks: Bookmark[],
  sort: LibraryPreferences['sort'],
): Bookmark[] {
  if (sort === 'relevance') return bookmarks;
  return [...bookmarks].sort((a, b) => {
    let difference: number;
    if (sort === 'name-asc' || sort === 'name-desc')
      difference =
        names.compare(a.title, b.title) * (sort === 'name-desc' ? -1 : 1);
    else
      difference = (a.createdAt - b.createdAt) * (sort === 'newest' ? -1 : 1);
    return difference || b.createdAt - a.createdAt || a.id.localeCompare(b.id);
  });
}
