import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import {
  createDuplicateRepository,
  duplicateGroups,
  duplicateUrl,
} from './duplicates';
const database = new OasisDatabase('duplicates-test'),
  bookmarks = createBookmarkRepository('default', database),
  repository = createDuplicateRepository('default', database);
afterEach(() => database.delete());
async function seed() {
  await database.open();
  return Promise.all(
    ['Original', 'Copy', 'Another copy'].map((title) =>
      bookmarks.save({
        title,
        url: 'https://example.com/article?a=1#part',
        description: '',
        isFavorite: false,
      }),
    ),
  );
}
it('normalizes only safe URL syntax and preserves meaningful URL differences', async () => {
  expect(duplicateUrl('https://EXAMPLE.com:443')).toBe('https://example.com/');
  expect(duplicateUrl('javascript:alert(1)')).toBeUndefined();
  expect(duplicateUrl('https://user:password@example.com')).toBeUndefined();
  await seed();
  const all = await bookmarks.list();
  expect(duplicateGroups(all)).toHaveLength(1);
  const variants = [
    'http://example.com/article?a=1#part',
    'https://example.com/article?a=2#part',
    'https://example.com/article?a=1#other',
    'https://example.com/article/?a=1#part',
  ];
  expect(
    duplicateGroups([
      all[0]!,
      ...variants.map((url, index) => ({
        ...all[0]!,
        id: `variant-${index}`,
        url,
      })),
    ]),
  ).toHaveLength(0);
});
it('deletes only reviewed copies and retains the keeper metadata and tombstones', async () => {
  const ids = await seed();
  await database.transaction('rw', database.bookmarks, () =>
    database.bookmarks.update(ids[0]!, {
      notes: 'Keep my notes',
      isFavorite: true,
    }),
  );
  const records = await bookmarks.list(),
    keeper = records.find((item) => item.id === ids[0])!,
    copies = records.filter((item) => item.id !== keeper.id);
  await repository.removeCopies(keeper, copies);
  expect(await bookmarks.list()).toEqual([keeper]);
  expect((await database.bookmarks.get(copies[0]!.id))?.deletedAt).toBeTypeOf(
    'number',
  );
});
it('rejects changed URLs, revisions and cross-space IDs before deleting anything', async () => {
  const ids = await seed(),
    records = await bookmarks.list(),
    keeper = records.find((item) => item.id === ids[0])!,
    copy = records.find((item) => item.id === ids[1])!;
  await database.transaction('rw', database.bookmarks, () =>
    database.bookmarks.update(copy.id, { updatedAt: copy.updatedAt + 1 }),
  );
  await expect(repository.removeCopies(keeper, [copy])).rejects.toThrow(
    'changed',
  );
  await expect(repository.removeCopies(keeper, [keeper])).rejects.toThrow(
    'keep one',
  );
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'work',
      name: 'Work',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  const foreign = await createBookmarkRepository('work', database).save({
    title: 'Foreign',
    url: keeper.url,
    description: '',
    isFavorite: false,
  });
  const foreignRecord = (await database.bookmarks.get(foreign))!;
  await expect(
    repository.removeCopies(keeper, [foreignRecord]),
  ).rejects.toThrow('bookmark');
  expect(await bookmarks.list()).toHaveLength(3);
});
it('rolls back all selected deletions when the second update fails', async () => {
  const ids = await seed(),
    records = await bookmarks.list(),
    keeper = records.find((item) => item.id === ids[0])!;
  let updates = 0;
  const fail = () => {
    updates++;
    if (updates === 2) throw new Error('Storage failed');
  };
  database.bookmarks.hook('updating', fail);
  try {
    await expect(
      repository.removeCopies(
        keeper,
        records.filter((item) => item.id !== keeper.id),
      ),
    ).rejects.toThrow('Storage failed');
  } finally {
    database.bookmarks.hook('updating').unsubscribe(fail);
  }
  expect(await bookmarks.list()).toHaveLength(3);
});
