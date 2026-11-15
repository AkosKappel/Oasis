import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createSpaceRepository } from './spaces';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { createSpaceTransferRepository } from './space-transfer';
const database = new OasisDatabase('space-transfer-test');
afterEach(() => database.delete());
async function seed() {
  await database.open();
  const target = await createSpaceRepository(database).save('Work');
  const organization = createOrganizationRepository('default', database),
    destination = createOrganizationRepository(target, database);
  const parent = await organization.saveFolder('Reading');
  const folder = await organization.saveFolder('Guides', undefined, parent);
  const tag = await organization.saveTag({
    name: 'Reference',
    color: '#336699',
  });
  const targetParent = await destination.saveFolder('reading');
  const targetTag = await destination.saveTag({
    name: 'reference',
    color: '#aa4433',
  });
  const id = await createBookmarkRepository('default', database).save({
    title: 'Guide',
    url: 'https://example.com/guide',
    description: 'Keep',
    isFavorite: true,
    folderId: folder,
    tags: [tag],
  });
  await database.bookmarks.update(id, {
    notes: 'Personal note',
    openCount: 4,
    lastOpenedAt: 10,
  });
  return {
    target,
    id,
    targetParent,
    targetTag,
    repository: createSpaceTransferRepository('default', database),
  };
}
it('previews without writes, reuses matching paths/tags and copies content without activity', async () => {
  const { target, id, targetParent, targetTag, repository } = await seed();
  const review = await repository.preview([id], target, 'copy');
  expect(review.summary).toEqual({
    bookmarks: 1,
    newFolders: 1,
    reusedFolders: 1,
    newTags: 0,
    reusedTags: 1,
  });
  expect(await database.bookmarks.count()).toBe(1);
  await repository.apply(review);
  const copied = (await createBookmarkRepository(target, database).list())[0]!;
  expect(copied).toMatchObject({
    title: 'Guide',
    notes: 'Personal note',
    description: 'Keep',
    isFavorite: true,
    tags: [targetTag],
    openCount: 0,
  });
  expect(copied.id).not.toBe(id);
  expect(copied.lastOpenedAt).toBeUndefined();
  expect((await database.folders.get(copied.folderId!))?.parentId).toBe(
    targetParent,
  );
  expect((await database.tags.get(targetTag))?.color).toBe('#aa4433');
  expect(
    await createBookmarkRepository('default', database).list(),
  ).toHaveLength(1);
  await expect(repository.apply(review)).rejects.toThrow();
  expect(await createBookmarkRepository(target, database).list()).toHaveLength(
    1,
  );
});
it('moves atomically using a source tombstone and new target records', async () => {
  const { target, id, repository } = await seed();
  await repository.apply(await repository.preview([id], target, 'move'));
  expect(await createBookmarkRepository('default', database).list()).toEqual(
    [],
  );
  expect((await database.bookmarks.get(id))?.deletedAt).toBeTypeOf('number');
  expect(await createBookmarkRepository(target, database).list()).toHaveLength(
    1,
  );
});
it('rejects stale source/target graphs and foreign, deleted or same-space destinations', async () => {
  const { target, id, repository } = await seed();
  const review = await repository.preview([id], target, 'move');
  await database.bookmarks.update(id, { notes: 'Changed elsewhere' });
  await expect(repository.apply(review)).rejects.toThrow('changed');
  const current = await repository.preview([id], target, 'copy');
  await createOrganizationRepository(target, database).saveFolder(
    'Another folder',
  );
  await expect(repository.apply(current)).rejects.toThrow('changed');
  await expect(repository.preview([id], 'default', 'copy')).rejects.toThrow(
    'different',
  );
  await expect(
    createSpaceTransferRepository(target, database).preview(
      [id],
      'default',
      'copy',
    ),
  ).rejects.toThrow('bookmark');
  await createSpaceRepository(database).remove(target);
  await expect(repository.preview([id], target, 'copy')).rejects.toThrow(
    'space',
  );
  expect((await database.bookmarks.get(id))?.deletedAt).toBeUndefined();
});
it('rolls back new folders/tags and keeps originals when a destination write fails', async () => {
  const { target, id, repository } = await seed();
  const review = await repository.preview([id], target, 'move');
  const before = await database.folders.count();
  const fail = () => {
    throw new Error('Quota');
  };
  database.bookmarks.hook('creating', fail);
  try {
    await expect(repository.apply(review)).rejects.toThrow('Quota');
  } finally {
    database.bookmarks.hook('creating').unsubscribe(fail);
  }
  expect(await database.folders.count()).toBe(before);
  expect(await createBookmarkRepository(target, database).list()).toEqual([]);
  expect((await database.bookmarks.get(id))?.deletedAt).toBeUndefined();
});
