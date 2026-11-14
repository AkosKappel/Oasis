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
  expect(database.verno).toBe(2);
  expect(await database.bookmarks.get('saved')).toEqual(bookmark);
  expect(await database.preferences.count()).toBe(0);
});
