import Dexie, { type EntityTable } from 'dexie';
import type { Bookmark, Folder, Space, Tag } from '@/types/entities';
export class OasisDatabase extends Dexie {
  spaces!: EntityTable<Space, 'id'>;
  bookmarks!: EntityTable<Bookmark, 'id'>;
  folders!: EntityTable<Folder, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  constructor(name = 'oasis') {
    super(name);
    this.version(1).stores({
      spaces: 'id, name, updatedAt',
      bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
      folders: 'id, spaceId, [spaceId+parentId], updatedAt',
      tags: 'id, spaceId, [spaceId+name], updatedAt',
    });
    this.on('populate', (transaction) => {
      const now = Date.now();
      return transaction.table('spaces').add({
        id: 'default',
        name: 'Personal',
        createdAt: now,
        updatedAt: now,
      });
    });
  }
}
export const db = new OasisDatabase();
