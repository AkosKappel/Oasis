import type { AppearanceRecord } from './appearance';
import Dexie, { type EntityTable } from 'dexie';
import type {
  Bookmark,
  Folder,
  Space,
  Tag,
  ImageAlbum,
  AlbumImage,
  BackgroundSettings,
  QuoteCollection,
  Quote,
  QuoteSettings,
} from '@/types/entities';
export class OasisDatabase extends Dexie {
  quoteCollections!: EntityTable<QuoteCollection, 'id'>;
  quotes!: EntityTable<Quote, 'id'>;
  quoteSettings!: EntityTable<QuoteSettings, 'id'>;
  albums!: EntityTable<ImageAlbum, 'id'>;
  albumImages!: EntityTable<AlbumImage, 'id'>;
  backgrounds!: EntityTable<BackgroundSettings, 'id'>;
  preferences!: EntityTable<AppearanceRecord, 'id'>;
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
    this.version(2).stores({ preferences: 'id, spaceId' });
    this.version(3).stores({
      albums: 'id, spaceId',
      albumImages: 'id, spaceId, [spaceId+albumId]',
      backgrounds: 'id, spaceId',
    });
    this.version(4).stores({
      quoteCollections: 'id, spaceId',
      quotes: 'id, spaceId, [spaceId+collectionId]',
      quoteSettings: 'id, spaceId',
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
