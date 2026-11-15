import { assertBookmarkMediaBudget } from './bookmark-media';
import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import { validateBookmark } from './bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';

export interface Backup {
  format: 'oasis';
  version: 1;
  spaceId: 'default';
  exportedAt: number;
  bookmarks: Bookmark[];
  folders: Folder[];
  tags: Tag[];
}

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const invalid = () => new Error('This file is not a valid Oasis backup.');
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw invalid();
  return value;
}
function id(value: unknown): string {
  const result = text(value);
  if (!result.trim() || result.length > 200) throw invalid();
  return result;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw invalid();
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw invalid();
  return value;
}
function optionalText(record: Record<string, unknown>, key: string) {
  return record[key] === undefined ? {} : { [key]: text(record[key]) };
}
function metadata(record: Record<string, unknown>) {
  if (record.spaceId !== 'default' || record.deletedAt !== undefined)
    throw invalid();
  return {
    id: id(record.id),
    spaceId: 'default',
    createdAt: number(record.createdAt),
    updatedAt: number(record.updatedAt),
  };
}
function name(value: unknown) {
  const result = text(value).trim();
  if (!result || result.length > 80) throw invalid();
  return result;
}
function array<T>(
  value: unknown,
  parse: (record: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value) || value.length > 100_000) throw invalid();
  return value.map((entry) => parse(object(entry)));
}
function unique<T extends { id: string }>(records: T[]) {
  const map = new Map(records.map((record) => [record.id, record]));
  if (map.size !== records.length) throw invalid();
  return map;
}
function uniqueNames(records: { name: string }[]) {
  if (
    new Set(records.map((record) => record.name.toLowerCase())).size !==
    records.length
  ) {
    throw new Error(
      'Folder and tag names must be unique within each type. Rename conflicting items before restoring.',
    );
  }
}

export function validateBackup(value: unknown): Backup {
  const input = object(value);
  if (
    input.format !== 'oasis' ||
    input.version !== 1 ||
    input.spaceId !== 'default'
  ) {
    throw new Error('Choose an Oasis version 1 bookmark backup.');
  }
  const folders: Folder[] = array(input.folders, (record) => ({
    ...metadata(record),
    name: name(record.name),
    sortOrder: number(record.sortOrder),
    ...(record.parentId === undefined ? {} : { parentId: id(record.parentId) }),
    ...optionalText(record, 'icon'),
    ...optionalText(record, 'color'),
  }));
  const tags: Tag[] = array(input.tags, (record) => {
    const color = text(record.color);
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw invalid();
    return {
      ...metadata(record),
      name: name(record.name),
      color: color.toLowerCase(),
    };
  });
  const bookmarks: Bookmark[] = array(input.bookmarks, (record) => {
    if (!Array.isArray(record.tags)) throw invalid();
    const tagIds = record.tags.map(id);
    if (new Set(tagIds).size !== tagIds.length) throw invalid();
    const values = validateBookmark({
      title: text(record.title),
      url: text(record.url),
      description:
        record.description === undefined ? '' : text(record.description),
      isFavorite: bool(record.isFavorite),
      tags: tagIds,
      ...(record.folderId === undefined
        ? {}
        : { folderId: id(record.folderId) }),
    });
    const openCount = number(record.openCount);
    if (!Number.isSafeInteger(openCount)) throw invalid();
    return {
      ...metadata(record),
      ...values,
      tags: tagIds,
      isPinned: bool(record.isPinned),
      sortOrder: number(record.sortOrder),
      openCount,
      ...(record.lastOpenedAt === undefined
        ? {}
        : { lastOpenedAt: number(record.lastOpenedAt) }),
      ...optionalText(record, 'notes'),
      ...optionalText(record, 'favicon'),
      ...optionalText(record, 'image'),
      ...optionalText(record, 'customIcon'),
      ...optionalText(record, 'customIconColor'),
    };
  });
  const folderMap = unique(folders);
  const tagMap = unique(tags);
  unique(bookmarks);
  const siblingNames = new Set<string>();
  for (const folder of folders) {
    const key = JSON.stringify([
      folder.parentId ?? null,
      folder.name.toLowerCase(),
    ]);
    if (siblingNames.has(key))
      throw new Error('Folder names must be unique within each parent folder.');
    siblingNames.add(key);
  }
  uniqueNames(tags);
  const checked = new Set<string>();
  for (const folder of folders) {
    const path = new Set<string>();
    let current: Folder | undefined = folder;
    while (current && !checked.has(current.id)) {
      if (path.has(current.id))
        throw new Error('The backup contains a folder cycle.');
      path.add(current.id);
      if (current.parentId && !folderMap.has(current.parentId)) throw invalid();
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }
    for (const folderId of path) checked.add(folderId);
  }
  for (const bookmark of bookmarks) {
    if (
      (bookmark.folderId && !folderMap.has(bookmark.folderId)) ||
      bookmark.tags.some((tagId) => !tagMap.has(tagId))
    )
      throw invalid();
  }
  return {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: number(input.exportedAt),
    bookmarks,
    folders,
    tags,
  };
}

export function parseBackup(json: string): Backup {
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES)
    throw new Error('Choose a backup smaller than 10 MB.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw invalid();
  }
  return validateBackup(value);
}

export function createBackupRepository(
  database: OasisDatabase = db,
  spaceId = 'default',
) {
  async function snapshot(): Promise<Backup> {
    await requireSpace(database, spaceId);
    const active = <T extends { deletedAt?: number }>(record: T) =>
      record.deletedAt === undefined;
    const [bookmarks, folders, tags] = await Promise.all([
      database.bookmarks
        .where('spaceId')
        .equals(spaceId)
        .filter(active)
        .toArray(),
      database.folders
        .where('spaceId')
        .equals(spaceId)
        .filter(active)
        .toArray(),
      database.tags.where('spaceId').equals(spaceId).filter(active).toArray(),
    ]);
    return {
      format: 'oasis',
      version: 1,
      spaceId: 'default',
      exportedAt: Date.now(),
      bookmarks: bookmarks.map((record) => ({ ...record, spaceId: 'default' })),
      folders: folders.map((record) => ({ ...record, spaceId: 'default' })),
      tags: tags.map((record) => ({ ...record, spaceId: 'default' })),
    };
  }
  return {
    export() {
      return database.transaction(
        'r',
        database.spaces,
        database.bookmarks,
        database.folders,
        database.tags,
        async () => validateBackup(await snapshot()),
      );
    },
    async restore(value: unknown) {
      const backup = validateBackup(value);
      return database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        database.folders,
        database.tags,
        async () => {
          await requireSpace(database, spaceId);
          const additions: Pick<Backup, 'bookmarks' | 'folders' | 'tags'> = {
            bookmarks: [],
            folders: [],
            tags: [],
          };
          let kept = 0;
          for (const key of ['folders', 'tags', 'bookmarks'] as const) {
            const records = backup[key];
            const existingRecords = await database[key].bulkGet(
              records.map((record) => record.id),
            );
            for (const [index, record] of records.entries()) {
              const existing = existingRecords[index];
              if (existing) {
                if (
                  existing.spaceId !== spaceId ||
                  existing.deletedAt !== undefined
                )
                  throw new Error(
                    'A backup ID belongs to a deleted item or another space. Restore into a fresh Oasis profile.',
                  );
                kept++;
              } else {
                // The key selects matching record types from both collections.
                (additions[key] as (typeof record)[]).push(record);
              }
            }
          }
          const current = await snapshot();
          validateBackup({
            ...current,
            folders: [...current.folders, ...additions.folders],
            tags: [...current.tags, ...additions.tags],
            bookmarks: [...current.bookmarks, ...additions.bookmarks],
          });
          assertBookmarkMediaBudget(
            [...current.bookmarks, ...additions.bookmarks],
            current.bookmarks,
          );
          await database.folders.bulkAdd(
            additions.folders.map((record) => ({ ...record, spaceId })),
          );
          await database.tags.bulkAdd(
            additions.tags.map((record) => ({ ...record, spaceId })),
          );
          await database.bookmarks.bulkAdd(
            additions.bookmarks.map((record) => ({ ...record, spaceId })),
          );
          return {
            added:
              additions.bookmarks.length +
              additions.folders.length +
              additions.tags.length,
            kept,
          };
        },
      );
    },
  };
}

export const personalBackup = createBackupRepository();
