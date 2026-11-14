import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { builtinAlbums, builtinAlbumId } from './builtin-albums';
import { dailyItem } from '@/lib/daily-item';
import { createAlbumRepository, validateAlbumArchive } from './albums';
const database = new OasisDatabase('albums-test');
const repository = createAlbumRepository('default', database);
const image = {
  name: 'Sample',
  dataUrl: 'data:image/jpeg;base64,/9j/',
  width: 1,
  height: 1,
};
beforeEach(() => database.open());
afterEach(() => database.delete());
it('keeps album IDs on rename, validates names and checks image ownership', async () => {
  const id = await repository.saveAlbum(' Nature ');
  await repository.saveAlbum('Landscapes', id);
  await expect(repository.saveAlbum('landscapes')).rejects.toThrow(
    'already exists',
  );
  await repository.addImages(id, [image]);
  const saved = (await repository.export()).images[0]!;
  await repository.setBackground(id, saved.id);
  const other = await repository.saveAlbum('Other');
  await expect(repository.setBackground(other, saved.id)).rejects.toThrow(
    'this album',
  );
  expect((await repository.list()).background?.imageId).toBe(saved.id);
  await expect(
    repository.addImages(id, [
      { ...image, dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
    ]),
  ).rejects.toThrow();
});
it('releases image data, retains tombstones and clears selection on deletion', async () => {
  const id = await repository.saveAlbum('Nature');
  await repository.addImages(id, [image]);
  const saved = (await repository.export()).images[0]!;
  await repository.setBackground(id, saved.id);
  await repository.remove(id, 'album');
  expect((await repository.export()).albums).toEqual([]);
  expect((await database.albumImages.get(saved.id))?.dataUrl).toBe('');
  expect((await database.albumImages.get(saved.id))?.deletedAt).toBeTypeOf(
    'number',
  );
  expect((await repository.list()).background?.albumId).toBeUndefined();
});
it('round trips archives atomically and protects foreign or deleted IDs', async () => {
  const id = await repository.saveAlbum('Nature');
  await repository.addImages(id, [image]);
  const archive = await repository.export();
  await repository.restore(archive);
  expect((await repository.export()).images).toHaveLength(1);
  await repository.remove(id, 'album');
  await expect(repository.restore(archive)).rejects.toThrow('unavailable');
  const invalid = structuredClone(archive);
  invalid.images[0]!.albumId = 'missing';
  expect(() => validateAlbumArchive(invalid)).toThrow('relationships');
  const foreign = createAlbumRepository('work', database);
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'work',
      name: 'Work',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(foreign.addImages(id, [image])).rejects.toThrow('album');
});
it('rolls back image batches on storage failure and leaves existing data usable', async () => {
  const id = await repository.saveAlbum('Nature');
  function fail() {
    throw new Error('Quota exceeded');
  }
  database.albumImages.hook('creating', fail);
  try {
    await expect(repository.addImages(id, [image, image])).rejects.toThrow(
      'Quota',
    );
    expect((await repository.export()).images).toHaveLength(0);
  } finally {
    database.albumImages.hook('creating').unsubscribe(fail);
  }
  await repository.addImages(id, [image]);
  expect((await repository.export()).images).toHaveLength(1);
});

it('restores a portable archive into a fresh profile', async () => {
  const id = await repository.saveAlbum('Nature');
  await repository.addImages(id, [image]);
  const archive = await repository.export();
  const fresh = new OasisDatabase('albums-fresh-test');
  try {
    await fresh.open();
    const target = createAlbumRepository('default', fresh);
    await target.restore(archive);
    expect(await target.export()).toEqual(archive);
  } finally {
    await fresh.delete();
  }
});

it('persists daily rotation and rejects unreadable dimming levels', async () => {
  const id = await repository.saveAlbum('Nature');
  await repository.addImages(id, [image]);
  await repository.setBackground(id, undefined, {
    rotateDaily: true,
    dimming: 0.7,
  });
  expect((await repository.list()).background).toMatchObject({
    albumId: id,
    rotateDaily: true,
    dimming: 0.7,
  });
  await expect(
    repository.setBackground(id, undefined, {
      rotateDaily: true,
      dimming: 0.1,
    }),
  ).rejects.toThrow('dimming');
  expect((await repository.list()).background?.dimming).toBe(0.7);
});

it('provides offline built-ins without seeding storage or replacing existing preferences', async () => {
  const data = await repository.list();
  expect(data.albums).toHaveLength(4);
  expect(data.images).toHaveLength(8);
  expect(data.background).toBeUndefined();
  expect(await database.albums.count()).toBe(0);
  expect(await database.albumImages.count()).toBe(0);
  expect(await repository.export()).toMatchObject({ albums: [], images: [] });
  const id = await repository.saveAlbum('My album');
  await repository.addImages(id, [image]);
  const custom = (await repository.export()).images[0]!;
  await repository.setBackground(id, custom.id);
  await repository.list();
  expect((await repository.list()).background?.imageId).toBe(custom.id);
});
it('supports built-in fixed and daily backgrounds and rejects mixed assignments', async () => {
  const builtin = builtinAlbums('default');
  const album = builtin.albums[0]!;
  const first = builtin.images[0]!;
  await repository.setBackground(album.id, first.id);
  expect((await repository.list()).background?.imageId).toBe(first.id);
  await expect(
    repository.setBackground(builtin.albums[1]!.id, first.id),
  ).rejects.toThrow('this album');
  await expect(
    repository.setBackground('oasis:builtin:missing'),
  ).rejects.toThrow('album');
  await repository.setBackground(album.id, undefined, {
    rotateDaily: true,
    dimming: 0.7,
  });
  const items = builtin.images.filter((item) => item.albumId === album.id);
  const today = dailyItem(items, album.id, new Date(2026, 10, 14));
  expect(dailyItem(items, album.id, new Date(2026, 10, 14))).toEqual(today);
  expect(dailyItem(items, album.id, new Date(2026, 10, 15))?.id).not.toBe(
    today?.id,
  );
  expect((await repository.list()).background).toMatchObject({
    albumId: album.id,
    rotateDaily: true,
  });
});
it('protects bundled assets from writes and forged archive IDs', async () => {
  const id = builtinAlbumId('quiet-geometry');
  await expect(repository.saveAlbum('Changed', id)).rejects.toThrow('album');
  await expect(repository.addImages(id, [image])).rejects.toThrow('album');
  await expect(repository.remove(id, 'album')).rejects.toThrow('album');
  await expect(
    repository.remove(builtinAlbumId('jade-ridges'), 'image'),
  ).rejects.toThrow('image');
  expect(() =>
    validateAlbumArchive({
      format: 'oasis-albums',
      version: 1,
      albums: [
        { id, name: 'Forged', spaceId: 'default', createdAt: 0, updatedAt: 0 },
      ],
      images: [],
    }),
  ).toThrow('invalid records');
  expect((await repository.list()).images).toHaveLength(8);
});
