import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
const database = new OasisDatabase('bulk-test');
const bookmarks = createBookmarkRepository('default', database);
const organization = createOrganizationRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
async function seed() {
  return Promise.all(
    ['First', 'Second'].map((title) =>
      bookmarks.save({
        title,
        url: 'https://example.com',
        description: '',
        isFavorite: false,
      }),
    ),
  );
}
it('moves, adds/removes tags and soft-deletes the entire selected batch', async () => {
  const ids = await seed();
  const folder = await organization.saveFolder('Reading');
  const tag = await organization.saveTag({
    name: 'Reference',
    color: '#336699',
  });
  await bookmarks.bulkUpdate(ids, { kind: 'move', folderId: folder });
  await bookmarks.bulkUpdate(ids, { kind: 'tags', tags: [tag], mode: 'add' });
  expect(
    (await bookmarks.list()).every(
      (record) => record.folderId === folder && record.tags.includes(tag),
    ),
  ).toBe(true);
  await bookmarks.bulkUpdate(ids, {
    kind: 'tags',
    tags: [tag],
    mode: 'remove',
  });
  expect((await bookmarks.list()).every((record) => !record.tags.length)).toBe(
    true,
  );
  await bookmarks.bulkUpdate(ids, { kind: 'delete' });
  expect(await bookmarks.list()).toEqual([]);
  expect(
    (await database.bookmarks.toArray()).every(
      (record) => record.deletedAt !== undefined,
    ),
  ).toBe(true);
});
it('validates all ownership and assignment references before any writes', async () => {
  const ids = await seed();
  const before = await bookmarks.list();
  await expect(
    bookmarks.bulkUpdate([...ids, 'missing'], { kind: 'delete' }),
  ).rejects.toThrow('bookmark');
  await expect(
    bookmarks.bulkUpdate(ids, { kind: 'move', folderId: 'missing' }),
  ).rejects.toThrow('folder');
  expect(await bookmarks.list()).toEqual(before);
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'work',
      name: 'Work',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  const foreign = await createBookmarkRepository('work', database).save({
    title: 'Private',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  });
  await expect(
    bookmarks.bulkUpdate([...ids, foreign], { kind: 'delete' }),
  ).rejects.toThrow('bookmark');
  expect(await bookmarks.list()).toEqual(before);
});
it('rolls back the batch if storage fails midway and enforces selection bounds', async () => {
  const ids = await seed();
  let updates = 0;
  function fail() {
    if (++updates === 2) throw new Error('Storage failed');
  }
  database.bookmarks.hook('updating', fail);
  try {
    await expect(bookmarks.bulkUpdate(ids, { kind: 'delete' })).rejects.toThrow(
      'Storage failed',
    );
    expect(await bookmarks.list()).toHaveLength(2);
  } finally {
    database.bookmarks.hook('updating').unsubscribe(fail);
  }
  await expect(bookmarks.bulkUpdate([], { kind: 'delete' })).rejects.toThrow(
    'Select',
  );
  await expect(
    bookmarks.bulkUpdate(
      Array.from({ length: 1001 }, (_, i) => String(i)),
      { kind: 'delete' },
    ),
  ).rejects.toThrow('1,000');
});
