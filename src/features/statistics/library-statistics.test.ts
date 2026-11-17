import { expect, it } from 'vitest';
import { libraryStatistics } from './library-statistics';
import type { Bookmark } from '@/types/entities';
const base: Bookmark = {
  id: 'a',
  spaceId: 'default',
  title: 'A',
  url: 'https://example.com/a',
  createdAt: new Date(2026, 10, 1).getTime(),
  updatedAt: 1,
  tags: [],
  isFavorite: true,
  isPinned: false,
  sortOrder: 1,
  openCount: 3,
  notes: 'Useful',
};
it('counts active content, saved opens, exact hosts and retained additions without inventing activity history', () => {
  const stats = libraryStatistics(
    {
      bookmarks: [
        base,
        {
          ...base,
          id: 'b',
          url: 'https://docs.example.com',
          isFavorite: false,
          notes: '',
          folderId: 'folder',
          tags: ['tag'],
          openCount: 2,
        },
        { ...base, id: 'deleted', deletedAt: 3, openCount: 100 },
      ],
      folders: [],
      tags: [],
    },
    new Date(2026, 10, 15),
  );
  expect(stats).toMatchObject({
    bookmarks: 2,
    favorites: 1,
    notes: 1,
    unorganized: 1,
    untagged: 1,
    opens: 5,
  });
  expect(stats.hosts).toEqual([
    ['docs.example.com', 1],
    ['example.com', 1],
  ]);
  expect(stats.months.at(-1)).toMatchObject({ label: 'Nov 2026', count: 2 });
  expect(stats.frequent.map((item) => item.id)).toEqual(['a', 'b']);
});
it('handles empty libraries, invalid dates and dates outside the rolling year', () => {
  const stats = libraryStatistics(
    {
      bookmarks: [
        { ...base, createdAt: NaN, url: 'invalid' },
        { ...base, id: 'old', createdAt: 1 },
        { ...base, id: 'future', createdAt: new Date(2030, 1, 1).getTime() },
      ],
      folders: [],
      tags: [],
    },
    new Date(2026, 0, 1),
  );
  expect(stats.months).toHaveLength(12);
  expect(stats.months.reduce((sum, month) => sum + month.count, 0)).toBe(0);
  expect(
    libraryStatistics({ bookmarks: [], folders: [], tags: [] }).hosts,
  ).toEqual([]);
});
it('ranks tag usage and bookmarks per folder by full path, ignoring deleted records', () => {
  const folders = [
    { id: 'p', spaceId: 'default', name: 'Work', createdAt: 1, updatedAt: 1 },
    {
      id: 'c',
      spaceId: 'default',
      name: 'Docs',
      parentId: 'p',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'gone',
      spaceId: 'default',
      name: 'Old',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: 2,
    },
  ];
  const tags = [
    {
      id: 't1',
      spaceId: 'default',
      name: 'Read',
      color: '#000000',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 't2',
      spaceId: 'default',
      name: 'Tool',
      color: '#000000',
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const stats = libraryStatistics({
    bookmarks: [
      { ...base, id: '1', tags: ['t1', 't2'], folderId: 'c' },
      { ...base, id: '2', tags: ['t1'], folderId: 'c' },
      { ...base, id: '3', tags: ['t1'], folderId: 'p' },
      { ...base, id: '4', tags: ['t2'], folderId: 'gone' },
      { ...base, id: '5', tags: ['t2'], deletedAt: 3 },
    ],
    folders: folders.map((folder) => ({ ...folder, sortOrder: 0 })),
    tags,
  });
  expect(stats.tagUsage).toEqual([
    ['Read', 3],
    ['Tool', 2],
  ]);
  expect(stats.folderUsage).toEqual([
    ['Work / Docs', 2],
    ['Work', 1],
  ]);
});
it('counts saves per local day for 26 weeks ending today', () => {
  const now = new Date(2026, 10, 17, 12);
  const at = (days: number) => new Date(2026, 10, 17 - days, 9).getTime();
  const stats = libraryStatistics(
    {
      bookmarks: [
        { ...base, id: '1', createdAt: at(0) },
        { ...base, id: '2', createdAt: at(0) },
        { ...base, id: '3', createdAt: at(181) },
        { ...base, id: '4', createdAt: at(182) },
        { ...base, id: '5', createdAt: at(1), deletedAt: 1 },
      ],
      folders: [],
      tags: [],
    },
    now,
  );
  expect(stats.activity).toHaveLength(182);
  expect(stats.activity.at(-1)).toEqual({ day: '2026-11-17', count: 2 });
  expect(stats.activity[0]!.count).toBe(1);
  expect(stats.activity.reduce((sum, entry) => sum + entry.count, 0)).toBe(3);
});
