import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createBackupRepository,
  parseBackup,
  serializeBackup,
  validateBackup,
  type Backup,
} from './backup';

const database = new OasisDatabase('oasis-backup-test');
const repository = createBackupRepository(database);
beforeEach(() => database.open());
afterEach(() => database.delete());
function fixture(): Backup {
  return {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 100,
    folders: [
      {
        id: 'folder',
        spaceId: 'default',
        name: 'Reading',
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    tags: [
      {
        id: 'tag',
        spaceId: 'default',
        name: 'Learn',
        color: '#336699',
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    bookmarks: [
      {
        id: 'bookmark',
        spaceId: 'default',
        title: 'Example',
        url: 'https://example.com/',
        description: 'Read later',
        notes: 'A note',
        folderId: 'folder',
        tags: ['tag'],
        isFavorite: true,
        isPinned: false,
        sortOrder: 1,
        openCount: 2,
        lastOpenedAt: 3,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  };
}

describe('backup validation', () => {
  it('rejects malformed JSON, unknown versions, unsafe URLs and invalid field types', () => {
    expect(() => parseBackup('{')).toThrow();
    expect(() => validateBackup({ ...fixture(), version: 2 })).toThrow();
    for (const patch of [
      { url: 'javascript:alert(1)' },
      { url: 'https://name:secret@example.com' },
      { tags: 'tag' },
      { isFavorite: 'yes' },
      { openCount: -1 },
      { updatedAt: Infinity },
      { spaceId: 'other' },
    ]) {
      const backup = fixture();
      Object.assign(backup.bookmarks[0]!, patch);
      expect(() => validateBackup(backup)).toThrow();
    }
  });
  it('rejects duplicate IDs, duplicate names, dangling references and cycles', () => {
    const duplicate = fixture();
    duplicate.bookmarks.push(duplicate.bookmarks[0]!);
    expect(() => validateBackup(duplicate)).toThrow();
    const name = fixture();
    name.tags.push({ ...name.tags[0]!, id: 'second', name: 'LEARN' });
    expect(() => validateBackup(name)).toThrow();
    const missing = fixture();
    missing.bookmarks[0]!.tags = ['missing'];
    expect(() => validateBackup(missing)).toThrow();
    const cycle = fixture();
    cycle.folders[0]!.parentId = 'folder';
    expect(() => validateBackup(cycle)).toThrow('cycle');
  });
});

describe('transactional restore', () => {
  it('round trips records, IDs and relations and keeps existing edits on repeated restore', async () => {
    await repository.restore(fixture());
    expect(await repository.export()).toEqual({
      ...fixture(),
      exportedAt: expect.any(Number),
    });
    await database.transaction('rw', database.bookmarks, () =>
      database.bookmarks.update('bookmark', { title: 'Local edit' }),
    );
    expect(await repository.restore(fixture())).toEqual({ added: 0, kept: 3 });
    expect((await database.bookmarks.get('bookmark'))?.title).toBe(
      'Local edit',
    );
  });
  it('rejects cross-space ID collisions without writing anything', async () => {
    await database.transaction('rw', database.folders, () =>
      database.folders.add({ ...fixture().folders[0]!, spaceId: 'other' }),
    );
    await expect(repository.restore(fixture())).rejects.toThrow(
      'another space',
    );
    expect(await database.bookmarks.count()).toBe(0);
    expect(await database.tags.count()).toBe(0);
  });
  it('protects tombstones and rejects name conflicts in the merged library', async () => {
    await database.transaction('rw', database.folders, () =>
      database.folders.add({ ...fixture().folders[0]!, id: 'local' }),
    );
    await expect(repository.restore(fixture())).rejects.toThrow('unique');
    expect(await database.tags.count()).toBe(0);
    await database.transaction('rw', database.folders, () =>
      database.folders.update('local', { deletedAt: 3 }),
    );
    await repository.restore(fixture());
    await database.transaction('rw', database.bookmarks, () =>
      database.bookmarks.update('bookmark', { deletedAt: 3 }),
    );
    await expect(repository.restore(fixture())).rejects.toThrow('deleted');
    expect((await repository.export()).bookmarks).toEqual([]);
  });
  it('rolls back folders and tags when a bookmark write fails', async () => {
    function fail() {
      throw new Error('Storage failed');
    }
    database.bookmarks.hook('creating', fail);
    try {
      await expect(repository.restore(fixture())).rejects.toThrow(
        'Storage failed',
      );
      expect(await database.folders.count()).toBe(0);
      expect(await database.tags.count()).toBe(0);
      expect(await database.bookmarks.count()).toBe(0);
    } finally {
      database.bookmarks.hook('creating').unsubscribe(fail);
    }
  });
});

it('round trips nested folders with the same names under different parents', async () => {
  const backup = fixture();
  backup.folders.push(
    { ...backup.folders[0]!, id: 'parent', name: 'Work' },
    { ...backup.folders[0]!, id: 'nested', parentId: 'parent' },
  );
  backup.bookmarks[0]!.folderId = 'nested';
  await repository.restore(backup);
  const exported = await repository.export();
  expect(
    exported.folders.find((folder) => folder.id === 'nested')?.parentId,
  ).toBe('parent');
  expect(exported.bookmarks[0]?.folderId).toBe('nested');
});

it('round-trips an exported Library larger than the former 10 MB import limit', () => {
  const backup = fixture();
  const record = backup.bookmarks[0]!;
  backup.bookmarks = Array.from({ length: 550 }, (_, index) => ({
    ...record,
    id: `large-${index}`,
    notes: 'x'.repeat(20000),
  }));
  const json = serializeBackup(backup);
  expect(new TextEncoder().encode(json).byteLength).toBeGreaterThan(
    10 * 1024 * 1024,
  );
  expect(parseBackup(json).bookmarks).toHaveLength(550);
});
