import { expect, it } from 'vitest';
import type { Bookmark } from '@/types/entities';
import { sortBookmarks } from './sort-bookmarks';
const base = {
  spaceId: 'default',
  url: 'https://example.com/',
  tags: [],
  isFavorite: false,
  isPinned: false,
  sortOrder: 0,
  openCount: 0,
  updatedAt: 1,
};
const bookmarks: Bookmark[] = [
  { ...base, id: 'a', title: 'Resource 10', createdAt: 1 },
  { ...base, id: 'b', title: 'resource 2', createdAt: 3 },
  { ...base, id: 'c', title: 'Alpha', createdAt: 2 },
];
it('sorts names naturally and dates in both directions without mutating relevance results', () => {
  expect(
    sortBookmarks(bookmarks, 'name-asc').map((record) => record.id),
  ).toEqual(['c', 'b', 'a']);
  expect(
    sortBookmarks(bookmarks, 'name-desc').map((record) => record.id),
  ).toEqual(['a', 'b', 'c']);
  expect(sortBookmarks(bookmarks, 'newest').map((record) => record.id)).toEqual(
    ['b', 'c', 'a'],
  );
  expect(sortBookmarks(bookmarks, 'oldest').map((record) => record.id)).toEqual(
    ['a', 'c', 'b'],
  );
  expect(
    sortBookmarks(bookmarks, 'relevance').map((record) => record.id),
  ).toEqual(['a', 'b', 'c']);
  expect(bookmarks.map((record) => record.id)).toEqual(['a', 'b', 'c']);
});
