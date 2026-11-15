import { afterEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  safeBookmarkMedia,
  assertBookmarkMediaBudget,
  MAX_BOOKMARK_MEDIA_CHARACTERS,
} from './bookmark-media';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createBackupRepository } from './backup';
import { createSpaceRepository } from './spaces';
import { createSpaceTransferRepository } from './space-transfer';
const icon = `data:image/png;base64,${readFileSync('public/icon/32.png').toString('base64')}`;
const database = new OasisDatabase('bookmark-media-test');
afterEach(() => database.delete());
it('accepts bounded local rasters and rejects remote, SVG, mismatched and oversized images', () => {
  expect(safeBookmarkMedia(icon, 'icon')).toBe(icon);
  for (const value of [
    'https://example.com/icon.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    icon.replace('image/png', 'image/jpeg'),
    'data:image/png;base64,' + 'A'.repeat(400001),
  ])
    expect(safeBookmarkMedia(value, 'icon')).toBeUndefined();
  const bytes = Buffer.from(icon.split(',')[1]!, 'base64');
  bytes.writeUInt32BE(100000, 16);
  expect(
    safeBookmarkMedia(
      `data:image/png;base64,${bytes.toString('base64')}`,
      'preview',
    ),
  ).toBeUndefined();
});
it('caps total cached media while allowing reductions in oversized legacy imports', () => {
  const huge = { image: 'data:' + 'A'.repeat(MAX_BOOKMARK_MEDIA_CHARACTERS) };
  expect(() => assertBookmarkMediaBudget([huge])).toThrow('full');
  expect(() => assertBookmarkMediaBudget([huge], [huge])).not.toThrow();
  expect(() => assertBookmarkMediaBudget([], [huge])).not.toThrow();
});
it('preserves caches through edits, backup and transfer and releases deleted payloads', async () => {
  await database.open();
  const repo = createBookmarkRepository('default', database);
  const input = {
    title: 'Guide',
    url: 'https://example.com',
    description: 'Read',
    isFavorite: false,
  };
  const id = await repo.save({ ...input, favicon: icon, image: icon });
  await repo.save({ ...input, title: 'Edited' }, id);
  expect((await repo.list())[0]?.favicon).toBe(icon);
  // Legacy remote references stay portable but never qualify for rendering.
  await database.bookmarks.update(id, {
    image: 'https://example.com/legacy.png',
  });
  await repo.save(input, id);
  expect((await repo.list())[0]?.image).toBe('https://example.com/legacy.png');
  const backup = await createBackupRepository(database).export();
  expect(JSON.parse(JSON.stringify(backup)).bookmarks[0].favicon).toBe(icon);
  const target = await createSpaceRepository(database).save('Work');
  const transfers = createSpaceTransferRepository('default', database);
  await transfers.apply(await transfers.preview([id], target, 'copy'));
  expect(
    (await createBookmarkRepository(target, database).list())[0]?.favicon,
  ).toBe(icon);
  await repo.remove(id);
  expect((await database.bookmarks.get(id))?.favicon).toBeUndefined();
  expect((await database.bookmarks.get(id))?.image).toBeUndefined();
  await createSpaceRepository(database).remove(target);
  expect(
    (await database.bookmarks.where('spaceId').equals(target).first())?.favicon,
  ).toBeUndefined();
});
it('rejects unsafe new media before writing and lets the editor clear stored media', async () => {
  await database.open();
  const repo = createBookmarkRepository('default', database);
  const input = {
    title: 'Guide',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  };
  await expect(
    repo.save({ ...input, favicon: 'https://example.com/icon' }),
  ).rejects.toThrow('local PNG');
  expect(await database.bookmarks.count()).toBe(0);
  const id = await repo.save({ ...input, favicon: icon });
  await repo.save({ ...input, favicon: undefined }, id);
  expect((await repo.list())[0]?.favicon).toBeUndefined();
});

it('rolls back transfers and restores that exceed the destination image budget', async () => {
  await database.open();
  const input = {
    title: 'Guide',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  };
  const source = createBookmarkRepository('default', database);
  const id = await source.save({ ...input, favicon: icon });
  const target = await createSpaceRepository(database).save('Full');
  const destination = createBookmarkRepository(target, database);
  const fullId = await destination.save(input);
  await database.bookmarks.update(fullId, {
    image: 'data:' + 'A'.repeat(MAX_BOOKMARK_MEDIA_CHARACTERS),
  });
  const transfers = createSpaceTransferRepository('default', database);
  const review = await transfers.preview([id], target, 'move');
  await expect(transfers.apply(review)).rejects.toThrow('full');
  expect((await source.list()).map((record) => record.id)).toEqual([id]);
  expect(await destination.list()).toHaveLength(1);
  const archive = await createBackupRepository(database).export();
  archive.bookmarks = archive.bookmarks.map((record) => ({
    ...record,
    id: crypto.randomUUID(),
  }));
  await expect(
    createBackupRepository(database, target).restore(archive),
  ).rejects.toThrow('full');
  expect(await destination.list()).toHaveLength(1);
});
