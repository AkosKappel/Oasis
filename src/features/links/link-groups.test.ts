import { expect, it } from 'vitest';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { linkGroups } from './link-groups';
const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
const folders: Folder[] = [
  { ...meta, id: 'parent', name: 'Work', sortOrder: 2 },
  {
    ...meta,
    id: 'child',
    parentId: 'parent',
    name: 'References',
    sortOrder: 1,
  },
  { ...meta, id: 'empty', name: 'Empty', sortOrder: 3 },
];
const tags: Tag[] = [{ ...meta, id: 'tag', name: 'Reading', color: '#123456' }];
function bookmark(id: string, extra: Partial<Bookmark> = {}): Bookmark {
  return {
    ...meta,
    id,
    title: id,
    url: `https://example.com/${id}`,
    tags: [],
    isFavorite: false,
    isPinned: false,
    sortOrder: 1,
    openCount: 0,
    ...extra,
  };
}
it('preserves folder hierarchy, empty folders and manual order without mutating links', () => {
  const records = [
    bookmark('second', { sortOrder: 5 }),
    bookmark('first', { sortOrder: 2 }),
    bookmark('filed', { folderId: 'child' }),
    bookmark('missing', { folderId: 'gone', sortOrder: 3 }),
  ];
  const result = linkGroups(records, folders, tags, '', '', true);
  expect(result.unorganized.map((row) => row.id)).toEqual([
    'first',
    'missing',
    'second',
  ]);
  expect(result.folders.map((node) => node.name)).toEqual(['Work', 'Empty']);
  expect(result.folders[0]?.count).toBe(1);
  expect(result.folders[0]?.children[0]?.bookmarks[0]?.id).toBe('filed');
  expect(records.map((row) => row.id)).toEqual([
    'second',
    'first',
    'filed',
    'missing',
  ]);
});
it('combines a single tag with search and retains matching ancestors in every section', () => {
  const records = [
    bookmark('match', {
      folderId: 'child',
      tags: ['tag'],
      isFavorite: true,
      openCount: 3,
      lastOpenedAt: 1,
    }),
    bookmark('other'),
  ];
  const result = linkGroups(records, folders, tags, 'match', 'tag', false);
  expect(result.count).toBe(1);
  expect(result.folders).toHaveLength(1);
  expect(result.folders[0]?.children[0]?.bookmarks[0]?.id).toBe('match');
  expect(result.unorganized).toEqual([]);
  for (const section of [result.favorites, result.recent, result.frequent])
    expect(section.map((row) => row.id)).toEqual(['match']);
  expect(
    linkGroups(records, folders, tags, 'absent', 'tag', false).folders,
  ).toEqual([]);
});
it('keeps history in usage order and searches before the history limit', () => {
  const records = Array.from({ length: 60 }, (_, index) =>
    bookmark(`link${index}`, {
      folderId: 'child',
      lastOpenedAt: index + 1,
      openCount: index + 1,
    }),
  );
  const result = linkGroups(records, folders, tags, '', '', false);
  expect(result.recent).toHaveLength(50);
  expect(result.frequent[0]?.id).toBe('link59');
  expect(
    linkGroups(records, folders, tags, '"link0"', '', false).recent[0]?.id,
  ).toBe('link0');
});
it('keeps orphan and cyclic folders reachable', () => {
  const broken = [
    { ...folders[0]!, parentId: 'child' },
    { ...folders[1]!, parentId: 'parent' },
    { ...folders[2]!, parentId: 'gone' },
  ];
  const result = linkGroups(
    [bookmark('filed', { folderId: 'child' })],
    broken,
    tags,
    '',
    '',
    true,
  );
  expect(result.folders).toHaveLength(2);
  expect(
    result.folders
      .flatMap((node) => [node, ...node.children])
      .find((node) => node.id === 'child')?.bookmarks[0]?.id,
  ).toBe('filed');
});

it('filters deeply imported folder chains without recursive traversal', () => {
  const chain = Array.from({ length: 2000 }, (_, index) => ({
    ...meta,
    id: `folder${index}`,
    name: `Folder ${index}`,
    sortOrder: index,
    ...(index ? { parentId: `folder${index - 1}` } : {}),
  }));
  const result = linkGroups(
    [bookmark('deep', { folderId: 'folder1999', tags: ['tag'] })],
    chain,
    tags,
    'deep',
    'tag',
    true,
  );
  expect(result.folders).toHaveLength(1);
  expect(result.folders[0]?.count).toBe(1);
});
