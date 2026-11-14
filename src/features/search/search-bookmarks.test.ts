import { expect, it } from 'vitest';
import { filterBookmarks } from '@/features/bookmarks/filter-bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';
const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
const folders: Folder[] = [
  { ...meta, id: 'folder', name: 'Read later', sortOrder: 0 },
];
const tags: Tag[] = [
  { ...meta, id: 'tag', name: 'Web design', color: '#336699' },
];
const base: Bookmark = {
  ...meta,
  id: 'base',
  title: 'Documentation',
  url: 'https://docs.example.com/guide',
  notes: 'Accessible typography',
  tags: ['tag'],
  folderId: 'folder',
  isFavorite: true,
  isPinned: false,
  sortOrder: 0,
  openCount: 0,
};
const filters = { query: '', folderId: '', tagId: '', favoritesOnly: false };
function search(query: string, bookmarks = [base]) {
  return filterBookmarks(bookmarks, folders, tags, { ...filters, query });
}
it('tolerates word typos and transpositions while matching all search terms', () => {
  expect(search('documantation typogrpahy')).toEqual([base]);
  expect(search('desgin')).toEqual([base]);
  expect(search('docs impossible')).toEqual([]);
  expect(search('xy')).toEqual([]);
});
it('ranks full title, title substring and exact content ahead of typo matches', () => {
  const results = search('design', [
    { ...base, id: 'typo', title: 'Desgin', tags: [] },
    { ...base, id: 'substring', title: 'Design systems', tags: [] },
    { ...base, id: 'exact', title: 'Design', tags: [] },
    { ...base, id: 'content', title: 'Other', tags: [], description: 'Design' },
  ]);
  expect(results.map((record) => record.id)).toEqual([
    'exact',
    'substring',
    'content',
    'typo',
  ]);
});
it('combines quoted operators and rejects lookalike domains and incomplete operators', () => {
  expect(
    search(
      'tag:"WEB DESIGN" folder:"Read later" domain:example.com is:favorite',
    ),
  ).toEqual([base]);
  expect(
    search('domain:example.com', [
      { ...base, url: 'https://example.com.evil.test' },
    ]),
  ).toEqual([]);
  expect(search('tag:')).toEqual([]);
  expect(search('is:unknown')).toEqual([]);
  expect(search('tag:missing')).toEqual([]);
  expect(search('folder:missing')).toEqual([]);
});
it('matches phrases literally and ignores accents', () => {
  expect(search('"accessible typography"')).toEqual([base]);
  expect(search('"accessible typogrpahy"')).toEqual([]);
  expect(search('cafe', [{ ...base, title: 'Café' }])).toHaveLength(1);
});
it('keeps a realistic large library searchable without a search dependency', () => {
  const library = Array.from({ length: 10_000 }, (_, index) => ({
    ...base,
    id: String(index),
    title: `Resource ${index}`,
    url: `https://site${index % 100}.example.com/resource/${index}`,
    description: 'Browser extension development reference',
    notes: 'Collected articles and tools',
  }));
  const start = performance.now();
  const results = search('extensoin tag:"Web design"', library);
  const duration = performance.now() - start;
  expect(results).toHaveLength(10_000);
  console.info(
    `10,000-bookmark typo/operator query: ${duration.toFixed(1)} ms`,
  );
});
