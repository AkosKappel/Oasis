import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OasisDatabase } from './schema';
import { createOrganizationRepository } from './organization';
import { createBookmarkRepository } from './bookmarks';

const database = new OasisDatabase('organization-test');
const organization = createOrganizationRepository('default', database);
const bookmarks = createBookmarkRepository('default', database);
const input = {
  title: 'Example',
  url: 'https://example.com',
  description: '',
  isFavorite: true,
};
beforeEach(async () => {
  await database.open();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});

it('creates normalized folders and colored tags and preserves IDs on rename', async () => {
  const folderId = await organization.saveFolder(' Reading ');
  const tagId = await organization.saveTag({
    name: ' Design ',
    color: '#ABCDEF',
  });
  await organization.saveFolder('Resources', folderId);
  await organization.saveTag({ name: 'Creative', color: '#123456' }, tagId);
  database.close();
  await database.open();
  const { folders, tags } = await organization.list();
  expect(folders).toEqual([
    expect.objectContaining({
      id: folderId,
      name: 'Resources',
      spaceId: 'default',
    }),
  ]);
  expect(tags).toEqual([
    expect.objectContaining({
      id: tagId,
      name: 'Creative',
      color: '#123456',
      spaceId: 'default',
    }),
  ]);
});

it('normalizes colors and rejects empty, oversized, duplicate and invalid inputs', async () => {
  const folder = await organization.saveFolder('Reading');
  const tag = await organization.saveTag({ name: 'Design', color: '#ABCDEF' });
  expect((await database.tags.get(tag))?.color).toBe('#abcdef');
  await expect(organization.saveFolder(' reading ')).rejects.toThrow(
    'already exists',
  );
  await expect(
    organization.saveTag({ name: 'DESIGN', color: '#123456' }),
  ).rejects.toThrow('already exists');
  await expect(organization.saveFolder(' ')).rejects.toThrow('name');
  await expect(organization.saveFolder('a'.repeat(81))).rejects.toThrow('80');
  await expect(
    organization.saveTag({ name: ' ', color: '#123456' }),
  ).rejects.toThrow('name');
  await expect(
    organization.saveTag({ name: 'Other', color: 'red' }),
  ).rejects.toThrow('color');
  await organization.saveFolder('READING', folder);
  expect((await organization.list()).folders).toHaveLength(1);
});

it('saves one folder and deduplicated tags, then clears them explicitly', async () => {
  const folderId = await organization.saveFolder('Reading');
  const tagId = await organization.saveTag({
    name: 'Design',
    color: '#123456',
  });
  const id = await bookmarks.save({ ...input, folderId, tags: [tagId, tagId] });
  expect(await database.bookmarks.get(id)).toEqual(
    expect.objectContaining({ folderId, tags: [tagId] }),
  );
  await bookmarks.save({ ...input, title: 'Renamed' }, id);
  expect(await database.bookmarks.get(id)).toEqual(
    expect.objectContaining({ folderId, tags: [tagId] }),
  );
  await bookmarks.save({ ...input, folderId: '', tags: [] }, id);
  const updated = await database.bookmarks.get(id);
  expect(updated?.folderId).toBeUndefined();
  expect(updated?.tags).toEqual([]);
});

it('deleting a folder keeps its bookmarks and moves them to Unorganized', async () => {
  const folderId = await organization.saveFolder('Reading');
  const tag = await organization.saveTag({ name: 'Design', color: '#123456' });
  const id = await bookmarks.save({ ...input, folderId, tags: [tag] });
  await organization.removeFolder(folderId);
  const saved = await database.bookmarks.get(id);
  expect(saved?.folderId).toBeUndefined();
  expect(saved?.deletedAt).toBeUndefined();
  expect(saved?.tags).toEqual([tag]);
  expect((await organization.list()).folders).toEqual([]);
  expect((await database.folders.get(folderId))?.deletedAt).toEqual(
    expect.any(Number),
  );
  expect(await bookmarks.list()).toHaveLength(1);
  await expect(bookmarks.save({ ...input, folderId })).rejects.toThrow(
    'folder',
  );
});

it('deleting a tag removes only its assignments and preserves bookmarks', async () => {
  const first = await organization.saveTag({
    name: 'Design',
    color: '#123456',
  });
  const second = await organization.saveTag({
    name: 'Learning',
    color: '#abcdef',
  });
  const id = await bookmarks.save({ ...input, tags: [first, second] });
  await organization.removeTag(first);
  expect((await database.bookmarks.get(id))?.tags).toEqual([second]);
  expect(await bookmarks.list()).toHaveLength(1);
  expect((await database.tags.get(first))?.deletedAt).toEqual(
    expect.any(Number),
  );
  expect((await organization.list()).tags.map((tag) => tag.id)).toEqual([
    second,
  ]);
  await expect(bookmarks.save({ ...input, tags: [first] })).rejects.toThrow(
    'tag',
  );
});

it('rolls back bookmark changes if folder deletion fails', async () => {
  const folderId = await organization.saveFolder('Reading');
  const id = await bookmarks.save({ ...input, folderId });
  vi.spyOn(database.folders, 'update').mockRejectedValueOnce(
    new Error('Storage unavailable'),
  );
  await expect(organization.removeFolder(folderId)).rejects.toThrow(
    'Storage unavailable',
  );
  expect((await database.bookmarks.get(id))?.folderId).toBe(folderId);
  expect((await database.folders.get(folderId))?.deletedAt).toBeUndefined();
});

it('protects folders with children until nested-folder management is implemented', async () => {
  const parentId = await organization.saveFolder('Parent');
  const child = await organization.saveFolder('Child');
  await database.folders.update(child, { parentId });
  await expect(organization.removeFolder(parentId)).rejects.toThrow(
    'subfolders',
  );
  expect((await database.folders.get(parentId))?.deletedAt).toBeUndefined();
});

it('rejects cross-space relations and mutations without modifying either space', async () => {
  await database.spaces.add({
    id: 'work',
    name: 'Work',
    createdAt: 0,
    updatedAt: 0,
  });
  const work = createOrganizationRepository('work', database);
  const folder = await work.saveFolder('Work resources');
  const tag = await work.saveTag({ name: 'Work', color: '#123456' });
  await expect(bookmarks.save({ ...input, folderId: folder })).rejects.toThrow(
    'folder',
  );
  await expect(bookmarks.save({ ...input, tags: [tag] })).rejects.toThrow(
    'tag',
  );
  await expect(organization.saveFolder('Other', folder)).rejects.toThrow(
    'folder',
  );
  await expect(organization.removeFolder(folder)).rejects.toThrow('folder');
  await expect(
    organization.saveTag({ name: 'Other', color: '#123456' }, tag),
  ).rejects.toThrow('tag');
  await expect(organization.removeTag(tag)).rejects.toThrow('tag');
  expect(await bookmarks.list()).toEqual([]);
  expect(await organization.list()).toEqual({ folders: [], tags: [] });
  expect((await work.list()).folders).toHaveLength(1);
});

it('rejects operations on deleted records or unavailable spaces', async () => {
  const folder = await organization.saveFolder('Reading');
  const tag = await organization.saveTag({ name: 'Design', color: '#123456' });
  await organization.removeFolder(folder);
  await organization.removeTag(tag);
  await expect(organization.saveFolder('Renamed', folder)).rejects.toThrow(
    'folder',
  );
  await expect(
    organization.saveTag({ name: 'Renamed', color: '#123456' }, tag),
  ).rejects.toThrow('tag');
  await expect(organization.removeFolder('missing')).rejects.toThrow('folder');
  await expect(organization.removeTag('missing')).rejects.toThrow('tag');
  await database.spaces.update('default', { deletedAt: Date.now() });
  await expect(organization.saveFolder('Other')).rejects.toThrow('space');
  await expect(organization.list()).rejects.toThrow('space');
});
