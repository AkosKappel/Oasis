import { expect, it } from 'vitest';
import { sessionPreview, folderSession } from './session-tabs';
import type { Bookmark, Folder } from '@/types/entities';
it('normalizes titles and URLs, skips private/internal/credential URLs and deduplicates exactly', () => {
  const preview = sessionPreview([
    { url: 'https://example.com', title: '' },
    { url: 'https://example.com/' },
    { url: 'https://example.com/#hash' },
    { url: 'chrome://newtab' },
    { url: 'https://user:pass@example.com' },
    { url: 'https://private.example', incognito: true },
    {},
  ]);
  expect(preview.rows).toEqual([
    { title: 'example.com', url: 'https://example.com/' },
    { title: 'example.com', url: 'https://example.com/#hash' },
  ]);
  expect(preview.skipped).toBe(4);
  expect(preview.duplicates).toBe(1);
  expect(() =>
    sessionPreview(
      Array.from({ length: 501 }, () => ({ url: 'https://example.com' })),
    ),
  ).toThrow('500');
});
it('includes descendants only when requested and keeps manual order and unique URLs', () => {
  const folders = [
    { id: 'parent' },
    { id: 'child', parentId: 'parent' },
  ] as Folder[];
  const bookmarks = [
    {
      id: 'a',
      title: 'One',
      url: 'https://example.com/1',
      sortOrder: 3,
      folderId: 'parent',
    },
    {
      id: 'b',
      title: 'Two',
      url: 'https://example.com/2',
      sortOrder: 1,
      folderId: 'child',
    },
    {
      id: 'c',
      title: 'Copy',
      url: 'https://example.com/1',
      sortOrder: 4,
      folderId: 'child',
    },
  ] as Bookmark[];
  expect(
    folderSession(bookmarks, folders, 'parent', true).map((row) => row.title),
  ).toEqual(['Two', 'One']);
  expect(folderSession(bookmarks, folders, 'parent', false)).toHaveLength(1);
  expect(folderSession(bookmarks, folders, 'missing', true)).toEqual([]);
});
