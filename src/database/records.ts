import type { EntityTable, Table } from 'dexie';
import type { OasisDatabase } from './schema';
import type { RecordMetadata } from '@/types/entities';

export async function requireSpace(database: OasisDatabase, spaceId: string) {
  const space = await database.spaces.get(spaceId);
  if (!space || space.deletedAt !== undefined) {
    throw new Error('This space is unavailable.');
  }
}

export async function requireOwnedRecord<
  T extends RecordMetadata & { spaceId: string },
>(
  table: Pick<Table<T, string>, 'get'>,
  id: string,
  spaceId: string,
  label: string,
): Promise<T> {
  const record = await table.get(id);
  if (!record || record.spaceId !== spaceId || record.deletedAt !== undefined) {
    throw new Error(`This ${label} is no longer available.`);
  }
  return record;
}

export async function requireUniqueName<
  T extends RecordMetadata & { spaceId: string; name: string },
>(
  table: EntityTable<T, 'id'>,
  spaceId: string,
  name: string,
  id: string | undefined,
  label: string,
) {
  const duplicate = await table
    .where('spaceId')
    .equals(spaceId)
    .filter(
      (record) =>
        record.deletedAt === undefined &&
        record.id !== id &&
        record.name.toLowerCase() === name.toLowerCase(),
    )
    .first();
  if (duplicate) throw new Error(`A ${label} with this name already exists.`);
}
