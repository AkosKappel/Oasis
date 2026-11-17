import { expect, it } from 'vitest';
import type { Bookmark } from '@/types/entities';
import { smartCollection } from './smart-collections';
const records: Bookmark[] = Array.from({ length: 70 }, (_, index) => ({
  id: String(index),
  spaceId: 'default',
  title: `Link ${index}`,
  url: `https://example.com/${index}`,
  tags: index % 2 ? ['tag'] : [],
  folderId: index % 3 ? 'folder' : undefined,
  isFavorite: index % 7 === 0,
  isPinned: false,
  sortOrder: index,
  openCount: 0,
  createdAt: index,
  updatedAt: index,
}));
it('derives collection membership and bounds recent additions without mutating the library', () => {
  expect(smartCollection(records, 'all')).toBe(records);
  const recent = smartCollection(records, 'recent');
  expect(recent).toHaveLength(50);
  expect(recent[0]?.id).toBe('69');
  expect(recent.at(-1)?.id).toBe('20');
  expect(smartCollection(records, 'favorites')).toHaveLength(10);
  expect(smartCollection(records, 'untagged')).toHaveLength(35);
  expect(smartCollection(records, 'unorganized')).toHaveLength(24);
  expect(records[0]?.id).toBe('0');
});
it('updates derived collections when a bookmark is organized or favorited', () => {
  const bookmark = {
    ...records[0]!,
    tags: ['tag'],
    folderId: 'folder',
    isFavorite: true,
  };
  expect(smartCollection([bookmark], 'untagged')).toEqual([]);
  expect(smartCollection([bookmark], 'unorganized')).toEqual([]);
  expect(smartCollection([bookmark], 'favorites')).toEqual([bookmark]);
  expect(smartCollection([], 'recent')).toEqual([]);
});

it('orders opened collections using counts and times, excluding unopened records', () => {
  const opened = [
    { ...records[0]!, openCount: 3, lastOpenedAt: 10 },
    { ...records[1]!, openCount: 1, lastOpenedAt: 20 },
    records[2]!,
  ];
  expect(
    smartCollection(opened, 'recently-opened').map((item) => item.id),
  ).toEqual(['1', '0']);
  expect(
    smartCollection(opened, 'frequently-opened').map((item) => item.id),
  ).toEqual(['0', '1']);
});
it('lists bookmarks not opened from Oasis in 90 days, oldest activity first', () => {
  const day = 86_400_000,
    now = 200 * day;
  const old = { ...records[0]!, id: 'old', createdAt: 10 * day };
  const openedLongAgo = {
    ...records[0]!,
    id: 'stale',
    createdAt: 0,
    lastOpenedAt: 50 * day,
  };
  const openedRecently = {
    ...records[0]!,
    id: 'fresh',
    createdAt: 0,
    lastOpenedAt: 150 * day,
  };
  const newlySaved = { ...records[0]!, id: 'new', createdAt: 180 * day };
  expect(
    smartCollection(
      [newlySaved, openedLongAgo, openedRecently, old],
      'not-opened',
      now,
    ).map((bookmark) => bookmark.id),
  ).toEqual(['old', 'stale']);
});
