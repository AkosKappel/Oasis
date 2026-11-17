import type { Bookmark, Folder, Tag } from '@/types/entities';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import {
  smartCollection,
  type SmartCollection,
} from '@/features/bookmarks/smart-collections';
import { sortBookmarks } from '@/features/bookmarks/sort-bookmarks';
import { folderOptions } from '@/features/organization/folder-tree';

export function linkGroups(
  bookmarks: Bookmark[],
  folders: Folder[],
  tags: Tag[],
  collection: SmartCollection,
  query: string,
  manualFolders: boolean,
) {
  const matches = filterBookmarks(bookmarks, folders, tags, {
    query,
    favoritesOnly: false,
    folderId: '',
    tagId: '',
  });
  // Filter first so older visited links can still be found beyond the default quick collection.
  const selected = smartCollection(matches, collection);
  const historical =
    collection === 'recently-opened' || collection === 'frequently-opened';
  const ordered = historical ? selected : sortBookmarks(selected, 'manual');
  if (historical) return [{ id: '', name: '', bookmarks: ordered }];
  const known = new Set(folders.map((folder) => folder.id));
  const groups = new Map<string, Bookmark[]>();
  for (const bookmark of ordered) {
    const key =
      bookmark.folderId && known.has(bookmark.folderId)
        ? bookmark.folderId
        : '';
    const group = groups.get(key) ?? [];
    group.push(bookmark);
    groups.set(key, group);
  }
  return [
    { id: '', name: '', bookmarks: groups.get('') ?? [] },
    ...folderOptions(folders, manualFolders)
      .filter((folder) => groups.has(folder.id))
      .map((folder) => ({
        id: folder.id,
        name: folder.path,
        bookmarks: groups.get(folder.id)!,
      })),
  ];
}
