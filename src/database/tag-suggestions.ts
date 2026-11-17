import type { Bookmark, Folder, Tag } from '@/types/entities';
export interface TagSuggestion {
  tag: Tag;
  uses: number;
  bookmarks: number;
}
export function suggestionHostname(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return url.hostname;
  } catch {
    return;
  }
}
export function suggestBookmarkTags(
  bookmarks: Bookmark[],
  tags: Tag[],
  url: string,
  spaceId: string,
  excludeId?: string,
): TagSuggestion[] {
  const hostname = suggestionHostname(url);
  if (!hostname)
    throw new Error(
      'Enter a complete http:// or https:// URL before suggesting tags.',
    );
  const available = new Map(
    tags
      .filter((tag) => tag.spaceId === spaceId && tag.deletedAt === undefined)
      .map((tag) => [tag.id, tag]),
  );
  const counts = new Map<string, number>();
  let matching = 0;
  for (const bookmark of bookmarks) {
    if (
      bookmark.spaceId !== spaceId ||
      bookmark.deletedAt !== undefined ||
      bookmark.id === excludeId ||
      suggestionHostname(bookmark.url) !== hostname
    )
      continue;
    matching++;
    for (const id of new Set(bookmark.tags))
      if (available.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, uses]) => ({
      tag: available.get(id)!,
      uses,
      bookmarks: matching,
    }))
    .sort(
      (a, b) =>
        b.uses - a.uses ||
        a.tag.name.localeCompare(b.tag.name) ||
        a.tag.id.localeCompare(b.tag.id),
    )
    .slice(0, 5);
}

export interface FolderSuggestion {
  folder: Folder;
  uses: number;
  bookmarks: number;
}

/** Folders that hold other bookmarks from the same website, most used first. */
export function suggestBookmarkFolders(
  bookmarks: Bookmark[],
  folders: Folder[],
  url: string,
  spaceId: string,
  excludeId?: string,
): FolderSuggestion[] {
  const hostname = suggestionHostname(url);
  if (!hostname)
    throw new Error(
      'Enter a complete http:// or https:// URL before suggesting a folder.',
    );
  const available = new Map(
    folders
      .filter(
        (folder) =>
          folder.spaceId === spaceId && folder.deletedAt === undefined,
      )
      .map((folder) => [folder.id, folder]),
  );
  const counts = new Map<string, number>();
  let matching = 0;
  for (const bookmark of bookmarks) {
    if (
      bookmark.spaceId !== spaceId ||
      bookmark.deletedAt !== undefined ||
      bookmark.id === excludeId ||
      suggestionHostname(bookmark.url) !== hostname
    )
      continue;
    matching++;
    if (bookmark.folderId && available.has(bookmark.folderId))
      counts.set(bookmark.folderId, (counts.get(bookmark.folderId) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, uses]) => ({
      folder: available.get(id)!,
      uses,
      bookmarks: matching,
    }))
    .sort(
      (a, b) =>
        b.uses - a.uses ||
        a.folder.name.localeCompare(b.folder.name) ||
        a.folder.id.localeCompare(b.folder.id),
    )
    .slice(0, 3);
}
