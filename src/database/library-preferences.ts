import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface LibraryPreferences {
  view: 'grid' | 'list';
  trackOpens?: boolean;
  sort: 'relevance' | 'name-asc' | 'name-desc' | 'newest' | 'oldest';
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
    !['grid', 'list'].includes(input.view) ||
    !['relevance', 'name-asc', 'name-desc', 'newest', 'oldest'].includes(
      input.sort,
    )
  )
    throw new Error('Choose a valid library view and sort order.');
  return {
    view: input.view,
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
      await database.transaction(
        'rw',
        database.spaces,
        database.libraryPreferences,
        async () => {
          await requireSpace(database, spaceId);
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
