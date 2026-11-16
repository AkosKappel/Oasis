import { expect, it } from 'vitest';
import { buildSearchQuery, emptyQueryFilters } from './build-search-query';
import { createBookmarkSearch } from '@/features/search/search-bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';
const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1, sortOrder: 0 };
const folders: Folder[] = [
  { ...meta, id: 'parent', name: 'Learning' },
  { ...meta, id: 'child', name: 'Web guides', parentId: 'parent' },
  { ...meta, id: 'nested', name: 'Examples', parentId: 'child' },
];
const tags: Tag[] = [
  { ...meta, id: 'tag', name: 'Read later', color: '#336699' },
];
const bookmark: Bookmark = {
  ...meta,
  id: 'bookmark',
  title: 'Useful reference guide',
  url: 'https://docs.example.com/a',
  folderId: 'nested',
  tags: ['tag'],
  isFavorite: true,
  isPinned: false,
  openCount: 0,
};
it('builds filters that the real search matcher evaluates together, including descendants', () => {
  const query = buildSearchQuery(
    {
      ...emptyQueryFilters,
      text: 'reference guide',
      domain: 'https://EXAMPLE.com',
      folderId: 'child',
      tagId: 'tag',
      favoritesOnly: true,
    },
    folders,
    tags,
  );
  expect(query).toBe(
    '"reference guide" domain:example.com folder:"Learning / Web guides" tag:"Read later" is:favorite',
  );
  const match = createBookmarkSearch(query, folders, tags);
  expect(match(bookmark)).toBeDefined();
  expect(match({ ...bookmark, isFavorite: false })).toBeUndefined();
  expect(match({ ...bookmark, url: 'https://example.org' })).toBeUndefined();
  expect(match({ ...bookmark, tags: [] })).toBeUndefined();
});
it('treats operator-like text literally and rejects ambiguous or stale filters', () => {
  const query = buildSearchQuery(
    { ...emptyQueryFilters, text: 'tag:secret' },
    folders,
    tags,
  );
  expect(query).toBe('"tag:secret"');
  expect(
    createBookmarkSearch(
      query,
      folders,
      tags,
    )({ ...bookmark, title: 'tag:secret' }),
  ).toBeDefined();
  for (const domain of [
    'https://user:password@example.com',
    'https://example.com/path',
    'example.com:8080',
    'https://example.com/?q=a',
    'javascript:alert(1)',
    'bad host',
  ])
    expect(() =>
      buildSearchQuery({ ...emptyQueryFilters, domain }, folders, tags),
    ).toThrow();
  expect(() => buildSearchQuery(emptyQueryFilters, folders, tags)).toThrow(
    'at least',
  );
  expect(() =>
    buildSearchQuery(
      { ...emptyQueryFilters, folderId: 'removed' },
      folders,
      tags,
    ),
  ).toThrow('available folder');
  expect(() =>
    buildSearchQuery({ ...emptyQueryFilters, tagId: 'removed' }, folders, tags),
  ).toThrow('available tag');
  expect(() =>
    buildSearchQuery(
      { ...emptyQueryFilters, text: 'a "quote"' },
      folders,
      tags,
    ),
  ).toThrow('double quotes');
  expect(() =>
    buildSearchQuery(
      { ...emptyQueryFilters, text: 'a'.repeat(1001) },
      folders,
      tags,
    ),
  ).toThrow('1,000');
});
