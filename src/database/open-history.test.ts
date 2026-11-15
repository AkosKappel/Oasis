import { afterEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOpenHistoryRepository } from './open-history';
import { createLibraryPreferencesRepository } from './library-preferences';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('open-history-test');
afterEach(() => database.delete());
async function seed() {
  await database.open();
  return createBookmarkRepository('default', database).save({
    title: 'Reference',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  });
}
it('starts disabled, counts concurrent opens atomically and retains counts when disabled', async () => {
  const id = await seed();
  const history = createOpenHistoryRepository('default', database);
  const preferences = createLibraryPreferencesRepository('default', database);
  await history.record(id);
  expect((await database.bookmarks.get(id))?.openCount).toBe(0);
  await preferences.save({ trackOpens: true });
  await Promise.all([history.record(id), history.record(id)]);
  expect(await database.bookmarks.get(id)).toMatchObject({
    openCount: 2,
    lastOpenedAt: expect.any(Number),
  });
  await preferences.save({ trackOpens: false });
  await history.record(id);
  expect((await database.bookmarks.get(id))?.openCount).toBe(2);
  await history.clear();
  expect(await database.bookmarks.get(id)).toMatchObject({ openCount: 0 });
  expect((await database.bookmarks.get(id))?.lastOpenedAt).toBeUndefined();
});
it('rejects foreign/deleted bookmarks and rolls back failed writes without affecting other spaces', async () => {
  const id = await seed();
  const work = await createSpaceRepository(database).save('Work');
  await createLibraryPreferencesRepository(work, database).save({
    trackOpens: true,
  });
  await expect(
    createOpenHistoryRepository(work, database).record(id),
  ).rejects.toThrow('bookmark');
  await createLibraryPreferencesRepository('default', database).save({
    trackOpens: true,
  });
  const history = createOpenHistoryRepository('default', database);
  const fail = () => {
    throw new Error('Quota');
  };
  database.bookmarks.hook('updating', fail);
  try {
    await expect(history.record(id)).rejects.toThrow('Quota');
  } finally {
    database.bookmarks.hook('updating').unsubscribe(fail);
  }
  expect((await database.bookmarks.get(id))?.openCount).toBe(0);
  await history.record(id);
  await createOpenHistoryRepository(work, database).clear();
  expect((await database.bookmarks.get(id))?.openCount).toBe(1);
  await createBookmarkRepository('default', database).remove(id);
  await expect(history.record(id)).rejects.toThrow('bookmark');
});
it('upgrades v13 preferences with counting disabled and preserves existing bookmark data', async () => {
  const legacy = new Dexie('open-history-test');
  legacy.version(13).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
    preferences: 'id, spaceId',
    albums: 'id, spaceId',
    albumImages: 'id, spaceId, [spaceId+albumId]',
    backgrounds: 'id, spaceId',
    quoteCollections: 'id, spaceId',
    quotes: 'id, spaceId, [spaceId+collectionId]',
    quoteSettings: 'id, spaceId',
    libraryPreferences: 'id, spaceId',
    dailyFocus: 'id, spaceId, [spaceId+day]',
    homeWidgets: 'id, spaceId',
    focusSessions: 'id, spaceId',
    weatherSettings: 'id, spaceId',
  });
  await legacy.open();
  await legacy
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  await legacy.table('libraryPreferences').add({
    id: 'default:library',
    spaceId: 'default',
    view: 'list',
    sort: 'oldest',
    createdAt: 1,
    updatedAt: 1,
  });
  await legacy.table('bookmarks').add({
    id: 'legacy',
    spaceId: 'default',
    title: 'Keep',
    url: 'https://example.com',
    tags: [],
    isFavorite: true,
    isPinned: false,
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
    openCount: 4,
    lastOpenedAt: 123,
  });
  legacy.close();
  await database.open();
  expect(database.verno).toBe(18);
  expect(
    await createLibraryPreferencesRepository('default', database).get(),
  ).toEqual({ view: 'list', sort: 'oldest', trackOpens: false });
  expect(await database.bookmarks.get('legacy')).toMatchObject({
    title: 'Keep',
    openCount: 4,
    lastOpenedAt: 123,
  });
});
