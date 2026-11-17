import type { Bookmark, Folder, Tag } from '@/types/entities';
import { folderOptions } from '@/features/organization/folder-tree';

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
  const tagCounts = new Map<string, number>();
  const folderCounts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    try {
      const host = new URL(bookmark.url).hostname;
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
    } catch {
      /* Invalid imported URLs do not contribute to host totals. */
    }
    for (const id of new Set(bookmark.tags))
      tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1);
    if (bookmark.folderId)
      folderCounts.set(
        bookmark.folderId,
        (folderCounts.get(bookmark.folderId) ?? 0) + 1,
      );
    const date = new Date(bookmark.createdAt);
    const month = months.find(
      (item) => item.key === `${date.getFullYear()}-${date.getMonth()}`,
    );
    if (month && bookmark.createdAt <= now.getTime()) month.count++;
  }
  // 26 weeks of saves by local day, oldest first, ending today.
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const activity = Array.from({ length: 182 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 181 + index,
    );
    return { day: dayKey(date), count: 0 };
  });
  const byDay = new Map(activity.map((entry) => [entry.day, entry]));
  for (const bookmark of bookmarks) {
    const entry = byDay.get(dayKey(new Date(bookmark.createdAt)));
    if (entry && bookmark.createdAt <= now.getTime()) entry.count++;
  }
  const activeFolders = library.folders.filter(
    (item) => item.deletedAt === undefined,
  );
  const paths = new Map(
    folderOptions(activeFolders).map((option) => [option.id, option.path]),
  );
  const top = (counts: Map<string, number>, names: Map<string, string>) =>
    [...counts]
      .flatMap(([id, count]) =>
        names.has(id) ? [[names.get(id)!, count] as const] : [],
      )
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);
  return {
    bookmarks: bookmarks.length,
    activity,
    tagUsage: top(
      tagCounts,
      new Map(
        library.tags
          .filter((item) => item.deletedAt === undefined)
          .map((tag) => [tag.id, tag.name]),
      ),
    ),
    folderUsage: top(folderCounts, paths),
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
