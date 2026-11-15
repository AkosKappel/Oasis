import { db, type OasisDatabase } from './schema';
import { validateBookmark, type BookmarkInput } from './bookmarks';
import { createBackupRepository, validateBackup, type Backup } from './backup';
import { requireSpace } from './records';
import type { Bookmark, Folder } from '@/types/entities';

// Larger or deeper libraries can use JSON until streaming HTML import is available.
export const MAX_HTML_BYTES = 10 * 1024 * 1024;
export const MAX_HTML_ITEMS = 10_000;
export const MAX_HTML_DEPTH = 32;
export interface HtmlFolder {
  name: string;
  parent?: number;
  createdAt?: number;
}
export interface HtmlBookmark {
  input: BookmarkInput;
  folder?: number;
  createdAt?: number;
}
export interface HtmlImport {
  folders: HtmlFolder[];
  bookmarks: HtmlBookmark[];
  skipped: number;
}
function validDate(value: number | undefined) {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000_000_000)
  )
    throw new Error('The bookmark file contains an invalid date.');
  return value;
}
export function validateHtmlImport(input: HtmlImport): HtmlImport {
  if (
    !Array.isArray(input.folders) ||
    !Array.isArray(input.bookmarks) ||
    input.folders.length + input.bookmarks.length > MAX_HTML_ITEMS ||
    !Number.isSafeInteger(input.skipped) ||
    input.skipped < 0
  )
    throw new Error('Import up to 10,000 items at a time, or use JSON backup.');
  const depths: number[] = [];
  const folders = input.folders.map((folder, index) => {
    if (
      typeof folder.name !== 'string' ||
      !folder.name.trim() ||
      folder.name.trim().length > 80
    )
      throw new Error('Keep folder names between 1 and 80 characters.');
    if (
      folder.parent !== undefined &&
      (!Number.isSafeInteger(folder.parent) ||
        folder.parent < 0 ||
        folder.parent >= index)
    )
      throw new Error('The bookmark file has an invalid folder hierarchy.');
    const depth = folder.parent === undefined ? 1 : depths[folder.parent]! + 1;
    if (depth > MAX_HTML_DEPTH)
      throw new Error('Import up to 32 folder levels, or use JSON backup.');
    depths.push(depth);
    return {
      name: folder.name.trim(),
      parent: folder.parent,
      createdAt: validDate(folder.createdAt),
    };
  });
  const bookmarks = input.bookmarks.map((bookmark) => {
    if (
      bookmark.folder !== undefined &&
      (!Number.isSafeInteger(bookmark.folder) ||
        bookmark.folder < 0 ||
        bookmark.folder >= folders.length)
    )
      throw new Error('The bookmark file has a missing folder.');
    const values = validateBookmark(bookmark.input);
    return {
      input: {
        title: values.title,
        url: values.url,
        description: values.description,
        isFavorite: false,
      },
      folder: bookmark.folder,
      createdAt: validDate(bookmark.createdAt),
    };
  });
  return { folders, bookmarks, skipped: input.skipped };
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

export function serializeBookmarkHtml(input: Backup): string {
  const backup = validateBackup(input);
  const folders = new Map<string | undefined, Folder[]>();
  const bookmarks = new Map<string | undefined, Bookmark[]>();
  for (const folder of backup.folders) {
    const siblings = folders.get(folder.parentId) ?? [];
    siblings.push(folder);
    folders.set(folder.parentId, siblings);
  }
  for (const bookmark of backup.bookmarks) {
    const siblings = bookmarks.get(bookmark.folderId) ?? [];
    siblings.push(bookmark);
    bookmarks.set(bookmark.folderId, siblings);
  }
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Oasis bookmarks</TITLE>',
    '<H1>Oasis bookmarks</H1>',
    '<DL><p>',
  ];
  type Event =
    | { kind: 'group'; id?: string; depth: number }
    | { kind: 'folder'; folder: Folder; depth: number }
    | { kind: 'close'; depth: number };
  const events: Event[] = [{ kind: 'group', depth: 0 }];
  while (events.length) {
    const event = events.pop()!;
    if (event.depth > MAX_HTML_DEPTH)
      throw new Error(
        'HTML export supports up to 32 folder levels. Use JSON backup for deeper libraries.',
      );
    const indent = '    '.repeat(event.depth);
    if (event.kind === 'close') {
      lines.push(`${indent}</DL><p>`);
      continue;
    }
    if (event.kind === 'folder') {
      lines.push(
        `${indent}<DT><H3 ADD_DATE="${Math.floor(event.folder.createdAt / 1000)}">${escape(event.folder.name)}</H3>`,
        `${indent}<DL><p>`,
      );
      events.push(
        { kind: 'close', depth: event.depth },
        { kind: 'group', id: event.folder.id, depth: event.depth },
      );
      continue;
    }
    for (const bookmark of (bookmarks.get(event.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )) {
      lines.push(
        `${indent}    <DT><A HREF="${escape(bookmark.url)}" ADD_DATE="${Math.floor(bookmark.createdAt / 1000)}" LAST_MODIFIED="${Math.floor(bookmark.updatedAt / 1000)}">${escape(bookmark.title)}</A>`,
      );
      if (bookmark.description)
        lines.push(`${indent}    <DD>${escape(bookmark.description)}`);
    }
    for (const folder of (folders.get(event.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .reverse())
      events.push({ kind: 'folder', folder, depth: event.depth + 1 });
  }
  lines.push('</DL><p>');
  return `${lines.join('\n')}\n`;
}

export function createBookmarkHtmlRepository(
  database: OasisDatabase = db,
  spaceId = 'default',
) {
  return {
    async export() {
      return serializeBookmarkHtml(
        await createBackupRepository(database, spaceId).export(),
      );
    },
    async import(input: HtmlImport) {
      const plan = validateHtmlImport(input);
      return database.transaction(
        'rw',
        database.spaces,
        database.folders,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          const folders = await database.folders
            .where('spaceId')
            .equals(spaceId)
            .filter((record) => record.deletedAt === undefined)
            .toArray();
          const bookmarks = await database.bookmarks
            .where('spaceId')
            .equals(spaceId)
            .filter((record) => record.deletedAt === undefined)
            .toArray();
          const siblingKey = (parent: string | undefined, name: string) =>
            JSON.stringify([parent ?? null, name.toLowerCase()]);
          const existingFolders = new Map(
            folders.map((folder) => [
              siblingKey(folder.parentId, folder.name),
              folder.id,
            ]),
          );
          const folderIds: string[] = [];
          const addedFolders: Folder[] = [];
          const now = Date.now();
          for (const folder of plan.folders) {
            const parentId =
              folder.parent === undefined
                ? undefined
                : folderIds[folder.parent];
            const key = siblingKey(parentId, folder.name);
            let id = existingFolders.get(key);
            if (!id) {
              id = crypto.randomUUID();
              existingFolders.set(key, id);
              addedFolders.push({
                id,
                spaceId,
                name: folder.name,
                parentId,
                sortOrder: now + addedFolders.length,
                createdAt: folder.createdAt ?? now,
                updatedAt: now,
              });
            }
            folderIds.push(id);
          }
          const bookmarkKey = (folder: string | undefined, url: string) =>
            JSON.stringify([folder ?? null, new URL(url).href]);
          const existingBookmarks = new Set(
            bookmarks.map((bookmark) =>
              bookmarkKey(bookmark.folderId, bookmark.url),
            ),
          );
          const addedBookmarks: Bookmark[] = [];
          let duplicates = 0;
          for (const bookmark of plan.bookmarks) {
            const folderId =
              bookmark.folder === undefined
                ? undefined
                : folderIds[bookmark.folder];
            const key = bookmarkKey(folderId, bookmark.input.url);
            if (existingBookmarks.has(key)) {
              duplicates++;
              continue;
            }
            existingBookmarks.add(key);
            addedBookmarks.push({
              ...bookmark.input,
              id: crypto.randomUUID(),
              spaceId,
              folderId,
              tags: [],
              isFavorite: false,
              isPinned: false,
              sortOrder: now + addedBookmarks.length,
              openCount: 0,
              createdAt: bookmark.createdAt ?? now,
              updatedAt: now,
            });
          }
          await database.folders.bulkAdd(addedFolders);
          await database.bookmarks.bulkAdd(addedBookmarks);
          return {
            bookmarks: addedBookmarks.length,
            folders: addedFolders.length,
            duplicates,
            skipped: plan.skipped,
          };
        },
      );
    },
  };
}
export const personalBookmarkHtml = createBookmarkHtmlRepository();
