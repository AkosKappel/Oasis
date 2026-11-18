import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface LibraryPreferences {
  folderOrder?: 'name' | 'manual';
  view: 'grid' | 'list';
  linksView?: 'list' | 'tiles';
  captureFolderId?: string;
  density?: 'comfortable' | 'compact';
  trackOpens?: boolean;
  sort: 'relevance' | 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'manual';
}
export interface LibraryPreferenceRecord
  extends LibraryPreferences, RecordMetadata {
  spaceId: string;
}
export const defaultLibraryPreferences: LibraryPreferences = {
  view: 'grid',
  trackOpens: false,
  sort: 'relevance',
};
export function validateLibraryPreferences(
  input: LibraryPreferences,
): LibraryPreferences {
  if (
    (input.trackOpens !== undefined && typeof input.trackOpens !== 'boolean') ||
    (input.folderOrder !== undefined &&
      !['name', 'manual'].includes(input.folderOrder)) ||
    !['grid', 'list'].includes(input.view) ||
    (input.linksView !== undefined &&
      !['list', 'tiles'].includes(input.linksView)) ||
    (input.density !== undefined &&
      !['comfortable', 'compact'].includes(input.density)) ||
    (input.captureFolderId !== undefined &&
      (typeof input.captureFolderId !== 'string' ||
        !input.captureFolderId ||
        input.captureFolderId.length > 200)) ||
    ![
      'relevance',
      'name-asc',
      'name-desc',
      'newest',
      'oldest',
      'manual',
    ].includes(input.sort)
  )
    throw new Error('Choose a valid library view and sort order.');
  return {
    ...(input.folderOrder !== undefined
      ? { folderOrder: input.folderOrder }
      : {}),
    view: input.view,
    ...(input.linksView !== undefined ? { linksView: input.linksView } : {}),
    ...(input.density === 'compact' ? { density: 'compact' as const } : {}),
    ...(input.captureFolderId !== undefined
      ? { captureFolderId: input.captureFolderId }
      : {}),
    sort: input.sort,
    trackOpens: input.trackOpens ?? false,
  };
}
export function createLibraryPreferencesRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const id = `${spaceId}:library`;
  async function existing() {
    const value = await database.libraryPreferences.get(id);
    if (value && (value.spaceId !== spaceId || value.deletedAt !== undefined))
      throw new Error('Library preferences are unavailable.');
    return value;
  }
  return {
    get() {
      return database.transaction(
        'r',
        database.spaces,
        database.libraryPreferences,
        async () => {
          await requireSpace(database, spaceId);
          return validateLibraryPreferences(
            (await existing()) ?? defaultLibraryPreferences,
          );
        },
      );
    },
    async save(patch: Partial<LibraryPreferences>) {
      // Folders join the transaction only when needed, so callers that save
      // inside their own transaction (manual ordering) need not include them.
      await database.transaction(
        'rw',
        [
          database.spaces,
          database.libraryPreferences,
          ...(patch.captureFolderId ? [database.folders] : []),
        ],
        async () => {
          await requireSpace(database, spaceId);
          if (patch.captureFolderId) {
            const folder = await database.folders.get(patch.captureFolderId);
            if (
              !folder ||
              folder.spaceId !== spaceId ||
              folder.deletedAt !== undefined
            )
              throw new Error('Choose a folder from this space.');
          }
          const current = await existing();
          const values = validateLibraryPreferences({
            ...defaultLibraryPreferences,
            ...current,
            ...patch,
          });
          const now = Date.now();
          await database.libraryPreferences.put({
            ...values,
            id,
            spaceId,
            createdAt: current?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
  };
}
export const personalLibraryPreferences =
  createLibraryPreferencesRepository('default');
