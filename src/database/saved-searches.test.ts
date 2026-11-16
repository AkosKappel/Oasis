import { afterEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { OasisDatabase, SCHEMA_VERSION } from './schema';
import {
  createSavedSearchRepository,
  validateSavedSearch,
} from './saved-searches';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('saved-search-test');
afterEach(() => database.delete());
it('validates names and queries without executing or changing their operators', () => {
  expect(
    validateSavedSearch({
      name: ' Reading ',
      query: ' tag:"Read later" domain:example.com ',
    }),
  ).toEqual({ name: 'Reading', query: 'tag:"Read later" domain:example.com' });
  expect(() => validateSavedSearch({ name: '', query: 'q' })).toThrow();
  expect(() => validateSavedSearch({ name: 'Name', query: ' ' })).toThrow();
  expect(() =>
    validateSavedSearch({ name: 'Name', query: 'x'.repeat(1001) }),
  ).toThrow();
});
it('scopes names and records, rejects stale changes and protects tombstones', async () => {
  await database.open();
  const repo = createSavedSearchRepository('default', database);
  const other = await createSpaceRepository(database).save('Work');
  const foreign = createSavedSearchRepository(other, database);
  const id = await repo.save({ name: 'Reading', query: 'tag:reading' });
  const initial = (await repo.list())[0]!;
  await expect(
    repo.save({ name: 'READING', query: 'domain:example.com' }),
  ).rejects.toThrow('already exists');
  await foreign.save({ name: 'Reading', query: 'domain:work.example' });
  await expect(
    foreign.save({ name: 'Changed', query: 'tag:new' }, id, initial.updatedAt),
  ).rejects.toThrow();
  await repo.save(
    { name: 'Reading', query: 'tag:reading is:favorite' },
    id,
    initial.updatedAt,
  );
  await expect(
    repo.save({ name: 'Stale', query: 'tag:old' }, id, initial.updatedAt),
  ).rejects.toThrow('changed');
  await expect(repo.remove(id, initial.updatedAt)).rejects.toThrow('changed');
  const updated = (await repo.list())[0]!;
  await repo.remove(id, updated.updatedAt);
  expect(await repo.list()).toEqual([]);
  await expect(
    repo.save({ name: 'Revive', query: 'q' }, id, updated.updatedAt),
  ).rejects.toThrow();
  expect((await database.savedSearches.get(id))?.deletedAt).toBeTypeOf(
    'number',
  );
  expect(await foreign.list()).toHaveLength(1);
  await createSpaceRepository(database).remove(other);
  expect(
    (await database.savedSearches.where('spaceId').equals(other).first())
      ?.deletedAt,
  ).toBeTypeOf('number');
});
it('caps active searches without counting tombstones', async () => {
  await database.open();
  await database.savedSearches.bulkAdd(
    Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      spaceId: 'default',
      name: `Search ${i}`,
      query: 'tag:reading',
      createdAt: 1,
      updatedAt: 1,
    })),
  );
  const repo = createSavedSearchRepository('default', database);
  await expect(repo.save({ name: 'Extra', query: 'q' })).rejects.toThrow('50');
  await repo.remove('0', 1);
  await repo.save({ name: 'Extra', query: 'q' });
  expect(await repo.list()).toHaveLength(50);
});
it('upgrades v18 while preserving content feedback and leaving saved searches empty', async () => {
  const name = 'saved-search-migration';
  const old = new Dexie(name);
  old.version(18).stores({
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
    contentFeedback: 'id, spaceId, [spaceId+kind]',
  });
  await old.open();
  await old
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  const vote = {
    id: 'vote',
    spaceId: 'default',
    kind: 'image',
    itemId: 'oasis:builtin:jade-ridges',
    rating: 'like',
    createdAt: 1,
    updatedAt: 1,
  };
  await old.table('contentFeedback').add(vote);
  old.close();
  const upgraded = new OasisDatabase(name);
  try {
    await upgraded.open();
    expect(upgraded.verno).toBe(SCHEMA_VERSION);
    expect(await upgraded.contentFeedback.get('vote')).toEqual(vote);
    expect(await upgraded.savedSearches.count()).toBe(0);
  } finally {
    await upgraded.delete();
  }
});
