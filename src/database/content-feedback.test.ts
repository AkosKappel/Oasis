import Dexie from 'dexie';
import { afterEach, expect, it } from 'vitest';
import { OasisDatabase, SCHEMA_VERSION } from './schema';
import { createContentFeedbackRepository } from './content-feedback';
import { builtinAlbums } from './builtin-albums';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('content-feedback-test');
afterEach(() => database.delete());
it('saves reversible built-in image feedback independently in each space', async () => {
  await database.open();
  const id = builtinAlbums('default').images[0]!.id;
  const repo = createContentFeedbackRepository('default', database);
  const other = await createSpaceRepository(database).save('Work');
  await repo.rate('image', id, 'like');
  await repo.rate('image', id, 'dislike');
  expect(await repo.list()).toMatchObject([{ itemId: id, rating: 'dislike' }]);
  expect(await createContentFeedbackRepository(other, database).list()).toEqual(
    [],
  );
  await repo.rate('image', id, null);
  expect(await repo.list()).toEqual([]);
  expect((await database.contentFeedback.toArray())[0]?.deletedAt).toBeTypeOf(
    'number',
  );
  await repo.rate('image', id, 'like');
  expect(await repo.list()).toHaveLength(1);
  await createSpaceRepository(database).remove(other);
  await expect(
    createContentFeedbackRepository(other, database).rate('image', id, 'like'),
  ).rejects.toThrow();
});
it('rejects foreign, missing and deleted user content without writing feedback', async () => {
  await database.open();
  const repo = createContentFeedbackRepository('default', database);
  const quote = {
    id: 'q',
    spaceId: 'foreign',
    collectionId: 'collection',
    text: 'Keep going',
    author: '',
    createdAt: 1,
    updatedAt: 1,
  };
  await database.quotes.add(quote);
  await expect(repo.rate('quote', 'q', 'like')).rejects.toThrow();
  await database.quotes.update('q', { spaceId: 'default', deletedAt: 2 });
  await expect(repo.rate('quote', 'q', 'like')).rejects.toThrow();
  await expect(repo.rate('image', 'not-a-built-in', 'like')).rejects.toThrow();
  expect(await database.contentFeedback.count()).toBe(0);
  await database.quotes.update('q', { deletedAt: undefined });
  await repo.rate('quote', 'q', 'like');
  expect(await repo.list()).toHaveLength(1);
});
it('upgrades v17 without changing background choices or adding ratings', async () => {
  const name = 'feedback-migration';
  const old = new Dexie(name);
  old.version(17).stores({
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
    dashboardLayouts: 'id, spaceId',
  });
  await old.open();
  await old
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  const background = {
    id: 'default:background',
    spaceId: 'default',
    albumId: 'existing',
    imageId: 'fixed',
    rotateDaily: false,
    dimming: 0.7,
    createdAt: 1,
    updatedAt: 1,
  };
  await old.table('backgrounds').add(background);
  old.close();
  const upgraded = new OasisDatabase(name);
  try {
    await upgraded.open();
    expect(upgraded.verno).toBe(SCHEMA_VERSION);
    expect(await upgraded.backgrounds.get(background.id)).toEqual(background);
    expect(await upgraded.contentFeedback.count()).toBe(0);
  } finally {
    await upgraded.delete();
  }
});
it('clears stale targets and resets only the requested kind and owned space', async () => {
  await database.open();
  const repo = createContentFeedbackRepository('default', database);
  const image = builtinAlbums('default').images[0]!.id;
  await repo.rate('image', image, 'like');
  await database.quotes.add({
    id: 'local',
    spaceId: 'default',
    collectionId: 'c',
    text: 'Keep going',
    author: '',
    createdAt: 1,
    updatedAt: 1,
  });
  await repo.rate('quote', 'local', 'dislike');
  await database.quotes.update('local', { deletedAt: 2 });
  const other = await createSpaceRepository(database).save('Other');
  const otherRepo = createContentFeedbackRepository(other, database);
  await otherRepo.rate('image', image, 'dislike');
  const foreign = (await otherRepo.list())[0]!;
  await expect(repo.clear(foreign.id)).rejects.toThrow();
  const stale = (await repo.list()).find((record) => record.kind === 'quote')!;
  await repo.clear(stale.id);
  expect((await repo.list()).map((record) => record.kind)).toEqual(['image']);
  await repo.reset('quote');
  expect(await repo.list()).toHaveLength(1);
  await repo.reset();
  expect(await repo.list()).toEqual([]);
  expect(await otherRepo.list()).toHaveLength(1);
  expect(
    (await database.contentFeedback.toArray())
      .filter((record) => record.spaceId === 'default')
      .every((record) => record.deletedAt !== undefined),
  ).toBe(true);
});
