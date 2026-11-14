import { expect, it } from 'vitest';
import { filterBookmarks } from './filter-bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';

const metadata = { createdAt: 0, updatedAt: 0, spaceId: 'default' };
const folders: Folder[] = [
  { ...metadata, id: 'folder', name: 'Resources', sortOrder: 0 },
];
const tags: Tag[] = [
  { ...metadata, id: 'tag', name: 'Learning', color: '#123456' },
];
const bookmarks: Bookmark[] = [
  {
    ...metadata,
    id: 'one',
    title: 'Example',
    url: 'https://example.com',
    description: 'Documentation',
    folderId: 'folder',
    tags: ['tag'],
    isFavorite: true,
    isPinned: false,
    openCount: 0,
    sortOrder: 0,
  },
  {
    ...metadata,
    id: 'two',
    title: 'Other',
    url: 'https://other.com',
    tags: [],
    isFavorite: false,
    isPinned: false,
    openCount: 0,
    sortOrder: 0,
  },
];
const filters = { query: '', folderId: '', tagId: '', favoritesOnly: false };
it('combines folder, tag, favorite and case-insensitive text filters', () => {
  expect(
    filterBookmarks(bookmarks, folders, tags, {
      query: '  DOC  ',
      folderId: 'folder',
      tagId: 'tag',
      favoritesOnly: true,
    }).map((item) => item.id),
  ).toEqual(['one']);
  expect(
    filterBookmarks(bookmarks, folders, tags, {
      ...filters,
      folderId: 'folder',
      tagId: 'untagged',
    }),
  ).toEqual([]);
});
it('searches folder and tag names as well as bookmark content', () => {
  for (const query of ['example.com', 'Resources', 'Learning']) {
    expect(
      filterBookmarks(bookmarks, folders, tags, { ...filters, query }).map(
        (item) => item.id,
      ),
    ).toEqual(['one']);
  }
});
it('finds unorganized and untagged bookmarks', () => {
  expect(
    filterBookmarks(bookmarks, folders, tags, {
      ...filters,
      folderId: 'unorganized',
      tagId: 'untagged',
    }).map((item) => item.id),
  ).toEqual(['two']);
});

it('includes descendants in folder filters and full-path folder operators', () => {
  const nested = [
    ...folders,
    {
      ...metadata,
      id: 'child',
      name: 'Articles',
      parentId: 'folder',
      sortOrder: 0,
    },
  ];
  const saved = [{ ...bookmarks[0]!, folderId: 'child' }, bookmarks[1]!];
  expect(
    filterBookmarks(saved, nested, tags, {
      ...filters,
      folderId: 'folder',
    }).map((record) => record.id),
  ).toEqual(['one']);
  expect(
    filterBookmarks(saved, nested, tags, {
      ...filters,
      query: 'folder:Resources',
    }).map((record) => record.id),
  ).toEqual(['one']);
  expect(
    filterBookmarks(saved, nested, tags, {
      ...filters,
      query: 'folder:"Resources / Articles"',
    }).map((record) => record.id),
  ).toEqual(['one']);
});
