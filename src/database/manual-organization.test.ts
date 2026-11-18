import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { createLibraryPreferencesRepository } from './library-preferences';
import { createSpaceRepository } from './spaces';
import { sortBookmarks } from '@/features/bookmarks/sort-bookmarks';
const database = new OasisDatabase('manual-organization-test');
afterEach(() => database.delete());
async function seed() {
  await database.open();
  const repository = createBookmarkRepository('default', database);
  const ids = [];
  for (const title of ['A', 'B', 'C'])
    ids.push(
      await repository.save({
        title,
        url: `https://example.com/${title}`,
        description: '',
        isFavorite: false,
      }),
    );
  return { repository, ids };
}
it('reorders only owned active bookmarks and saves Manual order atomically', async () => {
  const { repository, ids } = await seed();
  await repository.reorder(ids[2]!, ids[1]!);
  expect(
    sortBookmarks(await repository.list(), 'manual').map((item) => item.title),
  ).toEqual(['A', 'C', 'B']);
  expect(
    (await createLibraryPreferencesRepository('default', database).get()).sort,
  ).toBe('manual');
  const work = await createSpaceRepository(database).save('Work');
  const foreign = await createBookmarkRepository(work, database).save({
    title: 'Work',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  });
  await expect(repository.reorder(ids[0]!, foreign)).rejects.toThrow(
    'unavailable',
  );
  await repository.remove(ids[0]!);
  await expect(repository.reorder(ids[0]!, null)).rejects.toThrow(
    'unavailable',
  );
});
it('moves a bookmark into another folder while reordering', async () => {
  const { repository, ids } = await seed();
  const organization = createOrganizationRepository('default', database);
  const folder = await organization.saveFolder('Work');
  await repository.reorder(ids[2]!, ids[0]!, folder);
  const moved = (await repository.list()).find((item) => item.id === ids[2]);
  expect(moved?.folderId).toBe(folder);
  expect(
    sortBookmarks(await repository.list(), 'manual').map((item) => item.title),
  ).toEqual(['C', 'A', 'B']);
  await repository.reorder(ids[2]!, null, null);
  expect(
    (await repository.list()).find((item) => item.id === ids[2])?.folderId,
  ).toBeUndefined();
  const work = await createSpaceRepository(database).save('Work');
  const foreign = await createOrganizationRepository(work, database).saveFolder(
    'Elsewhere',
  );
  await expect(repository.reorder(ids[0]!, null, foreign)).rejects.toThrow();
});
it('moves folders without cycles, rejects cross-parent ordering and preserves ownership', async () => {
  await database.open();
  const repository = createOrganizationRepository('default', database);
  const a = await repository.saveFolder('A'),
    b = await repository.saveFolder('B'),
    child = await repository.saveFolder('Child', undefined, a);
  await repository.reorderFolder(b, a);
  expect(
    (await database.folders.toArray())
      .sort((x, y) => x.sortOrder - y.sortOrder)
      .filter((folder) => !folder.parentId)
      .map((folder) => folder.name),
  ).toEqual(['B', 'A']);
  await repository.moveFolder(child, b);
  expect((await database.folders.get(child))?.parentId).toBe(b);
  await expect(repository.moveFolder(b, child)).rejects.toThrow('subfolders');
  await expect(repository.reorderFolder(child, a)).rejects.toThrow(
    'unavailable',
  );
  const work = await createSpaceRepository(database).save('Work');
  const foreign = await createOrganizationRepository(work, database).saveFolder(
    'Foreign',
  );
  await expect(repository.moveFolder(a, foreign)).rejects.toThrow('folder');
});
it('rolls back rank changes when saving the ordering preference fails', async () => {
  const { repository, ids } = await seed();
  const before = await repository.list();
  const fail = () => {
    throw new Error('Quota');
  };
  database.libraryPreferences.hook('creating', fail);
  try {
    await expect(repository.reorder(ids[2]!, ids[0]!)).rejects.toThrow('Quota');
  } finally {
    database.libraryPreferences.hook('creating').unsubscribe(fail);
  }
  expect(await repository.list()).toEqual(before);
  expect(await database.libraryPreferences.count()).toBe(0);
});
