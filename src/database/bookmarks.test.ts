import { afterEach, beforeEach, expect, it } from 'vitest';
import { createBookmarkRepository, validateBookmark } from './bookmarks';
import { OasisDatabase } from './schema';

const database = new OasisDatabase('bookmarks-test');
const repository = createBookmarkRepository('default', database);
const input = {
  title: '  Example  ',
  url: ' https://example.com ',
  description: ' A useful site ',
  isFavorite: true,
};
beforeEach(async () => {
  await database.open();
});
afterEach(async () => {
  await database.delete();
});

it('normalizes input and persists bookmarks across database connections', async () => {
  const id = await repository.save(input);
  database.close();
  await database.open();
  expect(await repository.list()).toEqual([
    expect.objectContaining({
      id,
      spaceId: 'default',
      title: 'Example',
      url: 'https://example.com/',
      description: 'A useful site',
      isFavorite: true,
      tags: [],
      openCount: 0,
    }),
  ]);
});

it.each([
  'javascript:alert(1)',
  'data:text/html,test',
  'file:///tmp/test',
  'example.com',
  'https://user:password@example.com',
])('rejects unsupported or credential-bearing URL %s', (url) => {
  expect(() => validateBookmark({ ...input, url })).toThrow();
});

it('rejects empty titles without writing a record', async () => {
  await expect(repository.save({ ...input, title: '  ' })).rejects.toThrow(
    'title',
  );
  expect(await database.bookmarks.count()).toBe(0);
});

it('updates editable fields while preserving metadata', async () => {
  const id = await repository.save(input);
  await database.bookmarks.update(id, { openCount: 4, tags: ['tag-1'] });
  const original = await database.bookmarks.get(id);
  await repository.save({ ...input, title: 'Renamed', isFavorite: false }, id);
  expect(await database.bookmarks.get(id)).toEqual(
    expect.objectContaining({
      title: 'Renamed',
      isFavorite: false,
      createdAt: original?.createdAt,
      tags: ['tag-1'],
      openCount: 4,
    }),
  );
});

it('soft-deletes records and prevents editing deleted bookmarks', async () => {
  const id = await repository.save(input);
  await repository.remove(id);
  expect(await repository.list()).toEqual([]);
  expect((await database.bookmarks.get(id))?.deletedAt).toEqual(
    expect.any(Number),
  );
  await expect(repository.save(input, id)).rejects.toThrow(
    'no longer available',
  );
});

it('isolates queries and mutations by space', async () => {
  const id = await repository.save(input);
  await database.spaces.add({
    id: 'work',
    name: 'Work',
    createdAt: 0,
    updatedAt: 0,
  });
  const work = createBookmarkRepository('work', database);
  expect(await work.list()).toEqual([]);
  await expect(work.save(input, id)).rejects.toThrow('no longer available');
  await expect(work.remove(id)).rejects.toThrow('no longer available');
  expect(await repository.list()).toHaveLength(1);
});

it('rejects writes to missing spaces and updates to missing records', async () => {
  await expect(
    createBookmarkRepository('missing', database).save(input),
  ).rejects.toThrow('space');
  await expect(repository.save(input, 'missing')).rejects.toThrow(
    'no longer available',
  );
  expect(await database.bookmarks.count()).toBe(0);
});
