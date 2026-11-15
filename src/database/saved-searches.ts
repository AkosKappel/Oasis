import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace, requireUniqueName } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface SavedSearch extends RecordMetadata {
  spaceId: string;
  name: string;
  query: string;
}
export function validateSavedSearch(input: { name: string; query: string }) {
  if (
    !input ||
    typeof input.name !== 'string' ||
    typeof input.query !== 'string'
  )
    throw new Error('Enter a search name and query.');
  const name = input.name.trim(),
    query = input.query.trim();
  if (!name || name.length > 80)
    throw new Error('Enter a search name of up to 80 characters.');
  if (!query || query.length > 1000)
    throw new Error('Enter a search query of up to 1,000 characters.');
  return { name, query };
}
export function createSavedSearchRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async list() {
      await requireSpace(database, spaceId);
      return database.savedSearches
        .where('spaceId')
        .equals(spaceId)
        .filter((record) => record.deletedAt === undefined)
        .sortBy('name');
    },
    async save(
      input: { name: string; query: string },
      id?: string,
      expectedUpdatedAt?: number,
    ) {
      const values = validateSavedSearch(input);
      return database.transaction(
        'rw',
        database.spaces,
        database.savedSearches,
        async () => {
          await requireSpace(database, spaceId);
          const previous = id
            ? await requireOwnedRecord(
                database.savedSearches,
                id,
                spaceId,
                'saved search',
              )
            : undefined;
          if (previous && previous.updatedAt !== expectedUpdatedAt)
            throw new Error(
              'This saved search changed. Reopen it before saving.',
            );
          await requireUniqueName(
            database.savedSearches,
            spaceId,
            values.name,
            id,
            'saved search',
          );
          if (
            !previous &&
            (await database.savedSearches
              .where('spaceId')
              .equals(spaceId)
              .filter((record) => record.deletedAt === undefined)
              .count()) >= 50
          )
            throw new Error(
              'Keep up to 50 saved searches per space. Remove one before adding another.',
            );
          const now = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);
          const record: SavedSearch = {
            ...values,
            id: id ?? crypto.randomUUID(),
            spaceId,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          };
          await database.savedSearches.put(record);
          return record.id;
        },
      );
    },
    async remove(id: string, expectedUpdatedAt: number) {
      await database.transaction(
        'rw',
        database.spaces,
        database.savedSearches,
        async () => {
          await requireSpace(database, spaceId);
          const previous = await requireOwnedRecord(
            database.savedSearches,
            id,
            spaceId,
            'saved search',
          );
          if (previous.updatedAt !== expectedUpdatedAt)
            throw new Error(
              'This saved search changed. Review it before deleting.',
            );
          const now = Math.max(Date.now(), previous.updatedAt + 1);
          await database.savedSearches.update(id, {
            deletedAt: now,
            updatedAt: now,
          });
        },
      );
    },
  };
}
