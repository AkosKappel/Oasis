import { expect, it } from 'vitest';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { relatedBookmarks } from './related-bookmarks';

const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
function bookmark(
  id: string,
  title: string,
  url: string,
  extra: Partial<Bookmark> = {},
): Bookmark {
  return {
    ...meta,
    id,
    title,
    url,
    description: '',
    tags: [],
    isFavorite: false,
    isPinned: false,
    ...extra,
  } as Bookmark;
}
const folders = [{ ...meta, id: 'f1', name: 'Cooking' }] as Folder[];
const tags = [
  { ...meta, id: 't1', name: 'Recipes', color: '#123456' },
] as Tag[];

it('ranks shared tags, folders, sites and words above unrelated bookmarks', () => {
  const target = bookmark(
    'a',
    'Sourdough bread starter',
    'https://bake.example/starter',
    {
      tags: ['t1'],
      folderId: 'f1',
    },
  );
  const library = [
    target,
    bookmark('b', 'Rye bread loaf', 'https://other.example/rye', {
      tags: ['t1'],
    }),
    bookmark('c', 'Sourdough troubleshooting', 'https://bake.example/help', {
      folderId: 'f1',
    }),
    bookmark('d', 'Tax return deadline', 'https://gov.example/tax'),
    bookmark('e', 'Copy of the starter', 'https://bake.example/starter'),
    bookmark('f', 'Deleted bread', 'https://bake.example/old', {
      deletedAt: 2,
    }),
  ];
  const related = relatedBookmarks(target, library, folders, tags).map(
    (item) => item.id,
  );
  expect(related).toEqual(expect.arrayContaining(['b', 'c']));
  expect(related).not.toContain('a');
  expect(related).not.toContain('d');
  expect(related).not.toContain('e');
  expect(related).not.toContain('f');
  expect(related[0]).toBe('c');
});

it('returns nothing for a bookmark without distinctive words and respects the limit', () => {
  const target = bookmark('a', 'the and', 'not a url');
  expect(relatedBookmarks(target, [target], [], [])).toEqual([]);
  const many = Array.from({ length: 30 }, (_, index) =>
    bookmark(
      `x${index}`,
      index % 2 ? 'Garden planning tomatoes' : 'Invoice archive scans',
      `https://g${index}.example/`,
    ),
  );
  expect(relatedBookmarks(many[0]!, many, [], [], 5)).toHaveLength(5);
});

it('handles 10,000 bookmarks quickly', () => {
  const many = Array.from({ length: 10_000 }, (_, index) =>
    bookmark(
      `x${index}`,
      `Topic ${index % 50} notes number ${index}`,
      `https://site${index % 200}.example/${index}`,
    ),
  );
  const started = performance.now();
  relatedBookmarks(many[0]!, many, [], []);
  expect(performance.now() - started).toBeLessThan(1500);
});
