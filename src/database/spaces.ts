import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';

function nameFor(input: string) {
  if (typeof input !== 'string' || !input.trim() || input.trim().length > 80)
    throw new Error('Enter a space name between 1 and 80 characters.');
  return input.trim();
}
export function createSpaceRepository(database: OasisDatabase = db) {
  return {
    list() {
      return database.spaces
        .filter((record) => record.deletedAt === undefined)
        .sortBy('createdAt');
    },
    async save(input: string, id?: string) {
      const name = nameFor(input);
      return database.transaction('rw', database.spaces, async () => {
        if (id) await requireSpace(database, id);
        const duplicate = await database.spaces
          .filter(
            (record) =>
              record.deletedAt === undefined &&
              record.id !== id &&
              record.name.toLowerCase() === name.toLowerCase(),
          )
          .first();
        if (duplicate)
          throw new Error('A space with this name already exists.');
        const now = Date.now();
        if (id) {
          await database.spaces.update(id, { name, updatedAt: now });
          return id;
        }
        const created = crypto.randomUUID();
        await database.spaces.add({
          id: created,
          name,
          createdAt: now,
          updatedAt: now,
        });
        return created;
      });
    },
    async remove(id: string) {
      if (id === 'default')
        throw new Error('The default space cannot be deleted.');
      return database.transaction('rw', database.tables, async () => {
        await requireSpace(database, id);
        const now = Date.now();
        for (const table of database.tables) {
          if (table.name === 'spaces') continue;
          await table
            .where('spaceId')
            .equals(id)
            .modify(
              (record: {
                deletedAt?: number;
                updatedAt: number;
                dataUrl?: string;
                favicon?: string;
                image?: string;
                text?: string;
                highlights?: unknown[];
              }) => {
                record.deletedAt ??= now;
                record.updatedAt = now;
                if (table.name === 'bookmarks') {
                  record.favicon = undefined;
                  record.image = undefined;
                }
                if (table.name === 'albumImages') record.dataUrl = '';
                if (table.name === 'pageTexts') {
                  record.text = '';
                  record.highlights = [];
                }
              },
            );
        }
        await database.spaces.update(id, { deletedAt: now, updatedAt: now });
      });
    },
  };
}
export const spaces = createSpaceRepository();
