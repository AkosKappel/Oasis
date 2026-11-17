import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';

export const DESKTOP_COLUMNS = 8;
export const DESKTOP_ROWS = 6;

export interface DesktopItem extends RecordMetadata {
  spaceId: string;
  kind: 'bookmark' | 'folder';
  targetId: string;
  column: number;
  row: number;
}

export function validDesktopCell(column: number, row: number) {
  return (
    Number.isInteger(column) &&
    Number.isInteger(row) &&
    column >= 0 &&
    column < DESKTOP_COLUMNS &&
    row >= 0 &&
    row < DESKTOP_ROWS
  );
}

/** First free cell in reading order, or undefined when the desktop is full. */
export function freeDesktopCell(items: Pick<DesktopItem, 'column' | 'row'>[]) {
  const taken = new Set(items.map((item) => `${item.column}:${item.row}`));
  for (let row = 0; row < DESKTOP_ROWS; row++)
    for (let column = 0; column < DESKTOP_COLUMNS; column++)
      if (!taken.has(`${column}:${row}`)) return { column, row };
}

export function createDesktopRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  async function active() {
    return (
      await database.desktopItems.where('spaceId').equals(spaceId).toArray()
    ).filter((item) => item.deletedAt === undefined);
  }
  async function owned(id: string) {
    const item = await database.desktopItems.get(id);
    if (!item || item.spaceId !== spaceId || item.deletedAt !== undefined)
      throw new Error('This desktop item changed. Review the desktop again.');
    return item;
  }
  function write<T>(action: () => Promise<T>) {
    return database.transaction(
      'rw',
      [
        database.spaces,
        database.desktopItems,
        database.bookmarks,
        database.folders,
      ],
      async () => {
        await requireSpace(database, spaceId);
        return action();
      },
    );
  }
  return {
    list() {
      return database.transaction(
        'r',
        database.spaces,
        database.desktopItems,
        async () => {
          await requireSpace(database, spaceId);
          return active();
        },
      );
    },
    async add(kind: DesktopItem['kind'], targetId: string) {
      if (kind !== 'bookmark' && kind !== 'folder')
        throw new Error('Choose a link or folder for the desktop.');
      return write(async () => {
        const target = await (
          kind === 'bookmark' ? database.bookmarks : database.folders
        ).get(targetId);
        if (
          !target ||
          target.spaceId !== spaceId ||
          target.deletedAt !== undefined
        )
          throw new Error('This link or folder is no longer available.');
        const items = await active();
        if (items.some((item) => item.targetId === targetId))
          throw new Error('This item is already on the desktop.');
        const cell = freeDesktopCell(items);
        if (!cell)
          throw new Error(
            'The desktop is full. Remove an item to add another.',
          );
        const now = Date.now();
        const id = crypto.randomUUID();
        await database.desktopItems.add({
          id,
          spaceId,
          kind,
          targetId,
          ...cell,
          createdAt: now,
          updatedAt: now,
        });
        return id;
      });
    },
    /** Moves an item to a cell; an item already there swaps into the old cell. */
    async move(id: string, column: number, row: number) {
      if (!validDesktopCell(column, row))
        throw new Error('Choose a place inside the desktop.');
      return write(async () => {
        const item = await owned(id);
        const other = (await active()).find(
          (candidate) =>
            candidate.id !== id &&
            candidate.column === column &&
            candidate.row === row,
        );
        const now = Date.now();
        if (other)
          await database.desktopItems.update(other.id, {
            column: item.column,
            row: item.row,
            updatedAt: now,
          });
        await database.desktopItems.update(id, {
          column,
          row,
          updatedAt: now,
        });
      });
    },
    remove(id: string) {
      return write(async () => {
        await owned(id);
        const now = Date.now();
        await database.desktopItems.update(id, {
          deletedAt: now,
          updatedAt: now,
        });
      });
    },
  };
}
