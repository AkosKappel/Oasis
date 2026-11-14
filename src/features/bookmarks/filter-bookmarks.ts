import type { Bookmark, Folder, Tag } from '@/types/entities';

interface BookmarkFilters {
  query: string;
  favoritesOnly: boolean;
  folderId: string;
  tagId: string;
}

export function filterBookmarks(
  bookmarks: Bookmark[],
  folders: Folder[],
  tags: Tag[],
  filters: BookmarkFilters,
) {
  const query = filters.query.trim().toLowerCase();
  const folderNames = new Map(
    folders.map((folder) => [folder.id, folder.name]),
  );
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
  return bookmarks.filter((bookmark) => {
    if (filters.favoritesOnly && !bookmark.isFavorite) return false;
    if (
      filters.folderId === 'unorganized'
        ? !!bookmark.folderId
        : filters.folderId && bookmark.folderId !== filters.folderId
    )
      return false;
    if (
      filters.tagId === 'untagged'
        ? bookmark.tags.length > 0
        : filters.tagId && !bookmark.tags.includes(filters.tagId)
    )
      return false;
    const text = [
      bookmark.title,
      bookmark.url,
      bookmark.description ?? '',
      folderNames.get(bookmark.folderId ?? '') ?? '',
      ...bookmark.tags.map((id) => tagNames.get(id) ?? ''),
    ].join(' ');
    return text.toLowerCase().includes(query);
  });
}
