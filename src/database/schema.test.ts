import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
const database = new OasisDatabase('oasis-test');
afterEach(async () => {
  await database.delete();
});
it('creates the default space once and preserves it when reopened', async () => {
  await database.open();
  expect(await database.spaces.toArray()).toEqual([
    expect.objectContaining({ id: 'default', name: 'Personal' }),
  ]);
  await database.spaces.update('default', { name: 'Work' });
  database.close();
  await database.open();
  expect(await database.spaces.count()).toBe(1);
  expect((await database.spaces.get('default'))?.name).toBe('Work');
});

it('upgrades a v1 library without changing its bookmarks', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(1).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
  });
  await legacy.open();
  const bookmark = {
    id: 'saved',
    spaceId: 'default',
    title: 'Keep me',
    url: 'https://example.com',
    tags: [],
    isFavorite: true,
    isPinned: false,
    sortOrder: 1,
    openCount: 0,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('bookmarks'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('bookmarks').add(bookmark);
    },
  );
  legacy.close();
  await database.open();
  expect(database.verno).toBe(4);
  expect(await database.bookmarks.get('saved')).toEqual(bookmark);
  expect(await database.preferences.count()).toBe(0);
});

it('upgrades v2 preferences while adding empty media tables', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(2).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
    preferences: 'id, spaceId',
  });
  await legacy.open();
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'ocean',
    clock: '24',
    showDate: true,
    showFavorites: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual(preference);
  expect(await database.albums.count()).toBe(0);
  expect(await database.albumImages.count()).toBe(0);
});

it('upgrades v3 media without changing stored images', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(3).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
    preferences: 'id, spaceId',
    albums: 'id, spaceId',
    albumImages: 'id, spaceId, [spaceId+albumId]',
    backgrounds: 'id, spaceId',
  });
  await legacy.open();
  const image = {
    id: 'image',
    spaceId: 'default',
    albumId: 'album',
    name: 'Image',
    dataUrl: 'data:image/jpeg;base64,/9j/',
    width: 1,
    height: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('albums'),
    legacy.table('albumImages'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('albums').add({
        id: 'album',
        spaceId: 'default',
        name: 'Nature',
        createdAt: 1,
        updatedAt: 1,
      });
      await legacy.table('albumImages').add(image);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.albumImages.get('image')).toEqual(image);
  expect(await database.quotes.count()).toBe(0);
});
