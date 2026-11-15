import { expect, it } from 'vitest';
import type { Bookmark, Tag } from '@/types/entities';
import { suggestBookmarkTags } from './tag-suggestions';
const tag = (id: string, name = id): Tag => ({
  id,
  name,
  spaceId: 'default',
  color: '#336699',
  createdAt: 1,
  updatedAt: 1,
});
const bookmark = (
  id: string,
  url: string,
  tags: string[],
  spaceId = 'default',
): Bookmark => ({
  id,
  url,
  tags,
  spaceId,
  title: id,
  isFavorite: false,
  isPinned: false,
  sortOrder: 1,
  createdAt: 1,
  updatedAt: 1,
  openCount: 0,
});
it('ranks exact-host tag support and counts each bookmark once', () => {
  const bookmarks = [
    bookmark('a', 'https://example.com/a', ['reading', 'reading', 'reference']),
    bookmark('b', 'http://example.com/b', ['reading']),
    bookmark('c', 'https://example.com/c', []),
    bookmark('d', 'https://sub.example.com/d', ['other']),
    bookmark('e', 'https://example.com.evil.test', ['other']),
  ];
  const result = suggestBookmarkTags(
    bookmarks,
    [tag('reading'), tag('reference'), tag('other')],
    'https://EXAMPLE.com/new',
    'default',
  );
  expect(
    result.map((item) => ({
      id: item.tag.id,
      uses: item.uses,
      bookmarks: item.bookmarks,
    })),
  ).toEqual([
    { id: 'reading', uses: 2, bookmarks: 3 },
    { id: 'reference', uses: 1, bookmarks: 3 },
  ]);
});
it('ignores foreign/deleted records, inactive tags and the bookmark being edited', () => {
  const bookmarks = [
    bookmark('self', 'https://example.com', ['self']),
    bookmark('foreign', 'https://example.com', ['other'], 'work'),
    { ...bookmark('deleted', 'https://example.com', ['other']), deletedAt: 2 },
    bookmark('active', 'https://example.com', ['gone', 'wrong-space', 'keep']),
  ];
  const tags = [
    tag('self'),
    tag('other'),
    { ...tag('gone'), deletedAt: 2 },
    { ...tag('wrong-space'), spaceId: 'work' },
    tag('keep'),
  ];
  expect(
    suggestBookmarkTags(
      bookmarks,
      tags,
      'https://example.com',
      'default',
      'self',
    ).map((item) => item.tag.id),
  ).toEqual(['keep']);
});
it('bounds suggestions and handles invalid or unknown websites without fetching', () => {
  const tags = Array.from({ length: 8 }, (_, i) => tag(String(i)));
  const bookmarks = [
    bookmark(
      'a',
      'https://example.com',
      tags.map((tag) => tag.id),
    ),
  ];
  expect(
    suggestBookmarkTags(bookmarks, tags, 'https://example.com', 'default'),
  ).toHaveLength(5);
  expect(
    suggestBookmarkTags(bookmarks, tags, 'https://unknown.example', 'default'),
  ).toEqual([]);
  for (const url of [
    'not a URL',
    'javascript:alert(1)',
    'https://user:secret@example.com',
  ])
    expect(() => suggestBookmarkTags(bookmarks, tags, url, 'default')).toThrow(
      'complete',
    );
});
