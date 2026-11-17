import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createSessionRepository } from './sessions';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
const database = new OasisDatabase('sessions-test');
afterEach(async () => {
  await database.delete();
});
const tabs = [
  { title: 'One', url: 'https://example.com/one' },
  { title: 'Two', url: 'https://example.com/two' },
];
it('atomically saves an ordered session and rechecks duplicates against the whole space', async () => {
  const bookmarks = createBookmarkRepository('default', database);
  await bookmarks.save({ ...tabs[0]!, description: '', isFavorite: true });
  const repository = createSessionRepository('default', database);
  expect(
    await repository.save([...tabs, tabs[1]!], { name: 'Research' }),
  ).toEqual({ saved: 1, skipped: 2 });
  const folder = (await database.folders.toArray())[0]!;
  expect(
    (await bookmarks.list()).find((row) => row.url === tabs[1]!.url)?.folderId,
  ).toBe(folder.id);
  expect(await repository.save(tabs, { name: 'No empty folder' })).toEqual({
    saved: 0,
    skipped: 2,
  });
  expect(await database.folders.count()).toBe(1);
  const saved = (await bookmarks.list()).find(
    (row) => row.url === tabs[1]!.url,
  )!;
  await bookmarks.remove(saved.id);
  expect(
    (await repository.save([tabs[1]!], { folderId: folder.id })).saved,
  ).toBe(1);
  expect((await database.bookmarks.get(saved.id))?.deletedAt).toBeDefined();
});
it('rejects invalid, unavailable and foreign destinations without partial writes', async () => {
  await database.open();
  await database.spaces.add({
    id: 'work',
    name: 'Work',
    createdAt: 1,
    updatedAt: 1,
  });
  const folderId = await createOrganizationRepository(
    'work',
    database,
  ).saveFolder('Private');
  const repository = createSessionRepository('default', database);
  await expect(repository.save(tabs, { folderId })).rejects.toThrow('folder');
  await expect(repository.save(tabs, { name: '' })).rejects.toThrow('name');
  await expect(
    repository.save(
      [...tabs, { title: 'Unsafe', url: 'javascript:alert(1)' }],
      { name: 'Failed' },
    ),
  ).rejects.toThrow('http');
  await expect(
    createSessionRepository('gone', database).save(tabs, { name: 'Missing' }),
  ).rejects.toThrow('space');
  await expect(repository.save([], { name: 'Empty' })).rejects.toThrow(
    'Select',
  );
  expect(await database.bookmarks.count()).toBe(0);
});
it('rolls back the folder when a bookmark write fails and keeps the preview retryable', async () => {
  await database.open();
  const fail = () => {
    throw new Error('Simulated storage failure');
  };
  database.bookmarks.hook('creating', fail);
  await expect(
    createSessionRepository('default', database).save(tabs, {
      name: 'Research',
    }),
  ).rejects.toThrow('storage failure');
  database.bookmarks.hook('creating').unsubscribe(fail);
  expect(await database.folders.count()).toBe(0);
  expect(await database.bookmarks.count()).toBe(0);
  expect(
    (
      await createSessionRepository('default', database).save(tabs, {
        name: 'Research',
      })
    ).saved,
  ).toBe(2);
  const rows = await database.bookmarks.toCollection().sortBy('sortOrder');
  expect(rows[0]!.sortOrder).toBeLessThan(rows[1]!.sortOrder);
});
