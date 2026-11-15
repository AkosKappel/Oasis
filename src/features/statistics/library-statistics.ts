import type { Bookmark, Folder, Tag } from '@/types/entities';

export function libraryStatistics(
  library: { bookmarks: Bookmark[]; folders: Folder[]; tags: Tag[] },
  now = new Date(),
) {
  const bookmarks = library.bookmarks.filter(
    (item) => item.deletedAt === undefined,
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      count: 0,
    };
  });
  const hosts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    try {
      const host = new URL(bookmark.url).hostname;
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
    } catch {
      /* Invalid imported URLs do not contribute to host totals. */
    }
    const date = new Date(bookmark.createdAt);
    const month = months.find(
      (item) => item.key === `${date.getFullYear()}-${date.getMonth()}`,
    );
    if (month && bookmark.createdAt <= now.getTime()) month.count++;
  }
  return {
    bookmarks: bookmarks.length,
    folders: library.folders.filter((item) => item.deletedAt === undefined)
      .length,
    tags: library.tags.filter((item) => item.deletedAt === undefined).length,
    favorites: bookmarks.filter((item) => item.isFavorite).length,
    notes: bookmarks.filter((item) => item.notes?.trim()).length,
    unorganized: bookmarks.filter((item) => !item.folderId).length,
    untagged: bookmarks.filter((item) => !item.tags.length).length,
    opens: bookmarks.reduce((sum, item) => sum + item.openCount, 0),
    months,
    hosts: [...hosts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10),
    frequent: bookmarks
      .filter((item) => item.openCount > 0)
      .sort(
        (a, b) => b.openCount - a.openCount || a.title.localeCompare(b.title),
      )
      .slice(0, 5),
  };
}
