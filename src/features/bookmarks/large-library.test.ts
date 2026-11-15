import { expect, it } from 'vitest';
import { filterBookmarks } from './filter-bookmarks';
import { sortBookmarks } from './sort-bookmarks';
import type { Bookmark } from '@/types/entities';

it('filters and sorts a 10,000-record collection across common workloads', () => {
  const records: Bookmark[] = Array.from({ length: 10_000 }, (_, i) => ({
    id: String(i),
    spaceId: 'default',
    title: `Reference ${i}`,
    url: `https://example.com/${i}`,
    description: 'Documentation for development',
    tags: [],
    isFavorite: i % 10 === 0,
    isPinned: false,
    sortOrder: i,
    createdAt: i,
    updatedAt: i,
    openCount: 0,
  }));
  for (const [query, count] of [
    ['', 10_000],
    ['refernce', 10_000],
    ['domain:example.com is:favorite', 1000],
    ['"Reference 9999"', 1],
    ['nonexistentzzzz', 0],
  ] as const) {
    const start = performance.now();
    const result = filterBookmarks(records, [], [], {
      query,
      favoritesOnly: false,
      folderId: '',
      tagId: '',
    });
    expect(result).toHaveLength(count);
    console.log(
      JSON.stringify({
        workload: query || 'all',
        records: records.length,
        elapsedMs: Math.round(performance.now() - start),
      }),
    );
  }
  expect(sortBookmarks(records, 'name-asc')[0]?.title).toBe('Reference 0');
  expect(records[0]?.id).toBe('0');
});
