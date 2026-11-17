import type { Bookmark, Folder, Tag } from '@/types/entities';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import { smartCollection } from '@/features/bookmarks/smart-collections';
import { sortBookmarks } from '@/features/bookmarks/sort-bookmarks';

export interface LinkFolderNode {
  id: string;
  name: string;
  bookmarks: Bookmark[];
  children: LinkFolderNode[];
  count: number;
}

export function linkGroups(
  bookmarks: Bookmark[],
  folders: Folder[],
  tags: Tag[],
  query: string,
  tagId: string,
  manualFolders: boolean,
) {
  const matches = filterBookmarks(bookmarks, folders, tags, {
    query,
    favoritesOnly: false,
    folderId: '',
    tagId,
  });
  const nodes = new Map<string, LinkFolderNode>();
  const sorted = [...folders].sort((a, b) =>
    manualFolders
      ? a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
      : a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
  for (const folder of sorted)
    nodes.set(folder.id, {
      id: folder.id,
      name: folder.name,
      bookmarks: [],
      children: [],
      count: 0,
    });
  const roots: LinkFolderNode[] = [];
  const parents = new Map(
    folders.map((folder) => [
      folder.id,
      folder.parentId && nodes.has(folder.parentId)
        ? folder.parentId
        : undefined,
    ]),
  );
  const checked = new Set<string>();
  for (const folder of sorted) {
    const chain = new Set<string>();
    let ancestor: string | undefined = folder.id;
    while (ancestor && !checked.has(ancestor) && !chain.has(ancestor)) {
      chain.add(ancestor);
      ancestor = parents.get(ancestor);
    }
    // Break one edge of an imported cycle so every folder stays reachable.
    if (ancestor && chain.has(ancestor)) parents.set(ancestor, undefined);
    for (const id of chain) checked.add(id);
  }
  for (const folder of sorted) {
    const parentId = parents.get(folder.id);
    (parentId ? nodes.get(parentId)!.children : roots).push(
      nodes.get(folder.id)!,
    );
  }
  const unorganized: Bookmark[] = [];
  const ordered = sortBookmarks(matches, 'manual');
  for (const bookmark of ordered) {
    const folder = bookmark.folderId ? nodes.get(bookmark.folderId) : undefined;
    (folder ? folder.bookmarks : unorganized).push(bookmark);
  }
  const filtering = !!query.trim() || !!tagId;
  const traversal: LinkFolderNode[] = [];
  const pending = [...roots];
  while (pending.length) {
    const node = pending.pop()!;
    traversal.push(node);
    pending.push(...node.children);
  }
  // Count from leaves upward without recursive calls for deeply imported trees.
  for (const node of traversal.reverse()) {
    node.count =
      node.bookmarks.length +
      node.children.reduce((total, child) => total + child.count, 0);
    if (filtering)
      node.children = node.children.filter((child) => child.count > 0);
  }
  return {
    folders: roots.filter((node) => !filtering || node.count > 0),
    unorganized,
    ordered,
    count: matches.length,
    favorites: smartCollection(matches, 'favorites'),
    recent: smartCollection(matches, 'recently-opened'),
    frequent: smartCollection(matches, 'frequently-opened'),
  };
}
