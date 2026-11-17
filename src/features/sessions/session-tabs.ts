import { captureTab } from '@/features/capture/capture-tab';
import { descendantFolderIds } from '@/features/organization/folder-tree';
import type { Bookmark, Folder } from '@/types/entities';

export const MAX_SESSION_TABS = 500;
export const MAX_OPEN_TABS = 50;
export interface SessionTab {
  title: string;
  url: string;
}
export function sessionPreview(
  tabs: {
    title?: string;
    url?: string;
    pendingUrl?: string;
    incognito?: boolean;
  }[],
) {
  if (tabs.length > MAX_SESSION_TABS)
    throw new Error(
      'This window has more than 500 tabs. Move some to another window and try again.',
    );
  const rows: SessionTab[] = [];
  const seen = new Set<string>();
  let skipped = 0,
    duplicates = 0;
  for (const tab of tabs) {
    try {
      if (tab.incognito) throw new Error('Private tab');
      const input = captureTab({
        title: tab.title,
        url: tab.pendingUrl ?? tab.url,
      });
      if (seen.has(input.url)) {
        duplicates++;
        continue;
      }
      seen.add(input.url);
      rows.push({ title: input.title, url: input.url });
    } catch {
      skipped++;
    }
  }
  return { rows, skipped, duplicates };
}
export function folderSession(
  bookmarks: Bookmark[],
  folders: Folder[],
  folderId: string,
  nested: boolean,
): SessionTab[] {
  if (!folders.some((folder) => folder.id === folderId)) return [];
  const ids = nested
    ? descendantFolderIds(folders, folderId)
    : new Set([folderId]);
  return sessionPreview(
    [...bookmarks]
      .filter((row) => row.folderId && ids.has(row.folderId))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((row) => ({ title: row.title, url: row.url })),
  ).rows;
}
