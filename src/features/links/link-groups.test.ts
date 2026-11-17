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
it('groups each link once, includes full nested paths and preserves manual order', () => {
  const records = [
    bookmark('second', { sortOrder: 5 }),
    bookmark('first', { sortOrder: 2 }),
    bookmark('filed', { folderId: 'child' }),
    bookmark('missing', { folderId: 'gone', sortOrder: 3 }),
  ];
  const result = linkGroups(records, folders, tags, 'all', '', true);
  expect(
    result.map((group) => [group.name, group.bookmarks.map((row) => row.id)]),
  ).toEqual([
    ['', ['first', 'missing', 'second']],
    ['Work / References', ['filed']],
  ]);
  expect(records.map((row) => row.id)).toEqual([
    'second',
    'first',
    'filed',
    'missing',
  ]);
});
it('filters folders/tags and favorites before grouping, including empty results', () => {
  const records = [
    bookmark('match', { folderId: 'child', tags: ['tag'], isFavorite: true }),
    bookmark('other'),
  ];
  expect(
    linkGroups(records, folders, tags, 'favorites', 'tag:Reading', false)[1]
      ?.bookmarks[0]?.id,
  ).toBe('match');
  expect(
    linkGroups(records, folders, tags, 'all', 'absent', false).flatMap(
      (group) => group.bookmarks,
    ),
  ).toEqual([]);
  expect(
    linkGroups(
      records,
      folders,
      tags,
      'unorganized',
      '',
      false,
    )[0]?.bookmarks.map((row) => row.id),
  ).toEqual(['other']);
});
it('keeps history in usage order and searches beyond the unfiltered quick collection limit', () => {
  const records = Array.from({ length: 60 }, (_, index) =>
    bookmark(`link${index}`, {
      folderId: 'child',
      lastOpenedAt: index + 1,
      openCount: index + 1,
    }),
  );
  for (const collection of ['recently-opened', 'frequently-opened'] as const) {
    const result = linkGroups(records, folders, tags, collection, '', false);
    expect(result).toHaveLength(1);
    expect(result[0]?.bookmarks).toHaveLength(50);
    expect(result[0]?.bookmarks[0]?.id).toBe('link59');
    expect(
      linkGroups(records, folders, tags, collection, '"link0"', false)[0]
        ?.bookmarks[0]?.id,
    ).toBe('link0');
  }
});
