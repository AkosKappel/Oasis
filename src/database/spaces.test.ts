import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createSpaceRepository } from './spaces';
import { createBookmarkRepository } from './bookmarks';
import { createBackupRepository } from './backup';
import { createOrganizationRepository } from './organization';
import { createAppearanceRepository } from './appearance';
import { createAlbumRepository } from './albums';
import { createQuoteRepository } from './quotes';
const database = new OasisDatabase('spaces-test');
const spaces = createSpaceRepository(database);
afterEach(() => database.delete());
it('creates and renames unique spaces and keeps libraries and preferences isolated', async () => {
  await database.open();
  const work = await spaces.save(' Work ');
  await expect(spaces.save('work')).rejects.toThrow('already exists');
  await expect(spaces.save(' ')).rejects.toThrow('space name');
  await spaces.save('Projects', work);
  const id = await createBookmarkRepository(work, database).save({
    title: 'Private',
    url: 'https://example.com',
    description: '',
    isFavorite: true,
  });
  expect(await createBookmarkRepository('default', database).list()).toEqual(
    [],
  );
  expect(await createBookmarkRepository(work, database).list()).toHaveLength(1);
  await expect(
    createBookmarkRepository('default', database).remove(id),
  ).rejects.toThrow('bookmark');
  await createAppearanceRepository(work, database).save({
    ...(await createAppearanceRepository(work, database).get()),
    theme: 'dark',
  });
  expect(
    (await createAppearanceRepository('default', database).get()).theme,
  ).toBe('system');
  expect((await createAppearanceRepository(work, database).get()).theme).toBe(
    'dark',
  );
});
it('exports a portable scoped backup and restores only to the chosen space', async () => {
  await database.open();
  const work = await spaces.save('Work');
  const repository = createBookmarkRepository(work, database);
  await repository.save({
    title: 'Work only',
    url: 'https://example.com/work',
    description: '',
    isFavorite: false,
  });
  const archive = await createBackupRepository(database, work).export();
  expect(archive.bookmarks).toHaveLength(1);
  expect(archive.bookmarks[0]?.spaceId).toBe('default');
  expect((await createBackupRepository(database).export()).bookmarks).toEqual(
    [],
  );
  await expect(
    createBackupRepository(database).restore(archive),
  ).rejects.toThrow('another space');
  const fresh = new OasisDatabase('spaces-restored-test');
  try {
    await fresh.open();
    const target = await createSpaceRepository(fresh).save('Target');
    await createBackupRepository(fresh, target).restore(archive);
    expect(
      (await createBookmarkRepository(target, fresh).list())[0]?.title,
    ).toBe('Work only');
    expect(await createBookmarkRepository('default', fresh).list()).toEqual([]);
  } finally {
    await fresh.delete();
  }
});
it('soft-deletes the entire space atomically, protects default and rejects stale writes', async () => {
  await database.open();
  const work = await spaces.save('Work');
  const bookmarks = createBookmarkRepository(work, database);
  const id = await bookmarks.save({
    title: 'Work',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  });
  const folder = await createOrganizationRepository(work, database).saveFolder(
    'Work',
  );
  const fail = () => {
    throw new Error('Storage failed');
  };
  database.spaces.hook('updating', fail);
  try {
    await expect(spaces.remove(work)).rejects.toThrow('Storage failed');
  } finally {
    database.spaces.hook('updating').unsubscribe(fail);
  }
  expect((await database.bookmarks.get(id))?.deletedAt).toBeUndefined();
  await expect(spaces.remove('default')).rejects.toThrow('default');
  await spaces.remove(work);
  expect((await database.bookmarks.get(id))?.deletedAt).toBeTypeOf('number');
  expect((await database.folders.get(folder))?.deletedAt).toBeTypeOf('number');
  expect((await spaces.list()).map((space) => space.id)).toEqual(['default']);
  await expect(
    bookmarks.save({
      title: 'Stale',
      url: 'https://example.com',
      description: '',
      isFavorite: false,
    }),
  ).rejects.toThrow('space');
  await expect(spaces.save('Reopen', work)).rejects.toThrow('space');
});
it('keeps album and quote archives portable without exposing other spaces', async () => {
  await database.open();
  const work = await spaces.save('Work');
  const albums = createAlbumRepository(work, database);
  await albums.saveAlbum('Work images');
  const quotes = createQuoteRepository(work, database);
  await quotes.saveCollection('Work quotes');
  expect((await albums.export()).albums).toHaveLength(1);
  expect((await quotes.export()).collections).toHaveLength(1);
  expect(
    (await createAlbumRepository('default', database).export()).albums,
  ).toEqual([]);
  expect(
    (await createQuoteRepository('default', database).export()).collections,
  ).toEqual([]);
  await albums.restore(await albums.export());
  await quotes.restore(await quotes.export());
});
it('keeps at most one space that opens by default', async () => {
  await database.open();
  const work = await spaces.save('Work');
  const study = await spaces.save('Study');
  await spaces.setOpensByDefault(work);
  await spaces.setOpensByDefault(study);
  const flagged = () =>
    database.spaces
      .filter((space) => !!space.opensByDefault)
      .toArray()
      .then((records) => records.map((space) => space.id));
  expect(await flagged()).toEqual([study]);
  await spaces.setOpensByDefault('default');
  expect(await flagged()).toEqual([]);
  await expect(spaces.setOpensByDefault('missing')).rejects.toThrow();
});
it('saves an optional space icon and keeps it on rename', async () => {
  await database.open();
  const work = await spaces.save('Work', undefined, '💼');
  expect((await database.spaces.get(work))?.icon).toBe('💼');
  await spaces.save('Office', work);
  expect((await database.spaces.get(work))?.icon).toBe('💼');
  await spaces.save('Office', work, ' ');
  expect((await database.spaces.get(work))?.icon).toBeUndefined();
  await expect(spaces.save('Bad', undefined, '‮')).rejects.toThrow('icon');
});
