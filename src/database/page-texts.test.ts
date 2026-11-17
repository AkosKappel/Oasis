import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createPageTextRepository,
  MAX_PAGE_TEXT,
  normalizePageText,
  reanchorHighlights,
  validateHighlights,
} from './page-texts';
import { createBookmarkRepository } from './bookmarks';
import { createSpaceRepository } from './spaces';
import { findHighlightRange } from '@/features/page-texts/page-text-dialog';
const database = new OasisDatabase('page-texts-test');
const pages = createPageTextRepository('default', database);
beforeEach(() => database.open());
afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});
function bookmark(title = 'Guide') {
  return createBookmarkRepository('default', database).save({
    title,
    url: `https://example.com/${title}`,
    description: '',
    isFavorite: false,
    tags: [],
  });
}

it('normalizes whitespace, bounds size and finds non-overlapping phrases', () => {
  expect(normalizePageText('  One\t two \r\n\r\n\r\n\n three  ')).toBe(
    'One two\n\nthree',
  );
  expect(normalizePageText('x'.repeat(MAX_PAGE_TEXT + 5))).toHaveLength(
    MAX_PAGE_TEXT,
  );
  const text = 'Read this. Then read this again.';
  expect(findHighlightRange(text, 'read this', [])).toEqual({
    start: 0,
    end: 9,
  });
  expect(findHighlightRange(text, 'read this', [{ start: 0, end: 9 }])).toEqual(
    { start: 16, end: 25 },
  );
  expect(
    findHighlightRange(text, 'missing', [{ start: 0, end: 9 }]),
  ).toBeUndefined();
  expect(() =>
    validateHighlights(text, [{ id: 'a', start: 5, end: 99, createdAt: 1 }]),
  ).toThrow('invalid');
  expect(
    reanchorHighlights(text, 'New intro. ' + text, [
      { id: 'a', start: 11, end: 15, createdAt: 1 },
      { id: 'b', start: 0, end: 4, createdAt: 1 },
    ]),
  ).toEqual([
    { id: 'a', start: 22, end: 26, createdAt: 1 },
    { id: 'b', start: 11, end: 15, createdAt: 1 },
  ]);
});

it('saves owned copies, keeps highlights across refreshes and searches plain text', async () => {
  const id = await bookmark();
  await expect(pages.save('missing', 'Text')).rejects.toThrow('Save the');
  await expect(pages.save(id, '   ')).rejects.toThrow('no readable text');
  await pages.save(id, 'Local-first tools keep data close.');
  let record = (await pages.get(id))!;
  await pages.addHighlight(id, record.updatedAt, 0, 11, ' Key idea ');
  await expect(
    pages.addHighlight(id, record.updatedAt, 12, 17),
  ).rejects.toThrow('another tab');
  record = (await pages.get(id))!;
  expect(record.highlights).toMatchObject([
    { start: 0, end: 11, note: 'Key idea' },
  ]);
  await expect(pages.addHighlight(id, record.updatedAt, 5, 15)).rejects.toThrow(
    'already highlighted',
  );
  await pages.save(id, 'Intro. Local-first tools keep data close.');
  record = (await pages.get(id))!;
  expect(record.highlights).toMatchObject([{ start: 7, end: 18 }]);
  const highlight = record.highlights[0]!.id;
  await pages.updateHighlight(id, record.updatedAt, highlight, 'Changed');
  record = (await pages.get(id))!;
  expect(record.highlights[0]?.note).toBe('Changed');
  expect(await pages.savedIds()).toEqual(new Set([id]));
  expect(await pages.search('DATA CLOSE')).toEqual(new Set([id]));
  expect(await pages.search('da')).toEqual(new Set());
  await pages.removeHighlight(id, record.updatedAt, highlight);
  record = (await pages.get(id))!;
  expect(record.highlights).toEqual([]);
  await pages.remove(id, record.updatedAt);
  expect(await pages.get(id)).toBeUndefined();
  expect((await database.pageTexts.get(id))?.text).toBe('');
  expect(await pages.search('data close')).toEqual(new Set());
});

it('keeps copies inside their space and clears text when a space is deleted', async () => {
  const spaces = createSpaceRepository(database);
  const other = await spaces.save('Work');
  const otherPages = createPageTextRepository(other, database);
  const id = await bookmark();
  await pages.save(id, 'Private reading.');
  expect(await otherPages.get(id)).toBeUndefined();
  await expect(otherPages.save(id, 'Copy')).rejects.toThrow('Save the');
  expect(await otherPages.search('private')).toEqual(new Set());
  const otherBookmark = await createBookmarkRepository(other, database).save({
    title: 'Work page',
    url: 'https://example.com/work',
    description: '',
    isFavorite: false,
    tags: [],
  });
  await otherPages.save(otherBookmark, 'Quarterly plans.');
  await spaces.remove(other);
  expect((await database.pageTexts.get(otherBookmark))?.text).toBe('');
});
