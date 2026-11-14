import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createBookmarkHtmlRepository,
  serializeBookmarkHtml,
  validateHtmlImport,
  type HtmlImport,
} from './bookmark-html';
import { createOrganizationRepository } from './organization';
import { createBookmarkRepository } from './bookmarks';
const database = new OasisDatabase('oasis-html-test');
const repository = createBookmarkHtmlRepository(database);
beforeEach(() => database.open());
afterEach(() => database.delete());
function fixture(): HtmlImport {
  return {
    skipped: 1,
    folders: [{ name: 'Reading' }, { name: 'Articles', parent: 0 }],
    bookmarks: [
      {
        folder: 1,
        createdAt: 1000,
        input: {
          title: 'Example',
          url: 'https://example.com',
          description: 'A description',
          isFavorite: false,
        },
      },
    ],
  };
}
it('merges sibling folder paths and skips exact URL duplicates in the same folder', async () => {
  const plan = fixture();
  plan.bookmarks.push(plan.bookmarks[0]!, {
    ...plan.bookmarks[0]!,
    folder: undefined,
  });
  expect(await repository.import(plan)).toEqual({
    bookmarks: 2,
    folders: 2,
    duplicates: 1,
    skipped: 1,
  });
  expect(await repository.import(plan)).toEqual({
    bookmarks: 0,
    folders: 0,
    duplicates: 3,
    skipped: 1,
  });
  expect(await database.bookmarks.count()).toBe(2);
  const imported = await database.bookmarks.toArray();
  expect(imported.every((bookmark) => bookmark.createdAt === 1000)).toBe(true);
});
it('keeps distinct fragments and query strings and never overwrites local descriptions', async () => {
  const plan = fixture();
  plan.bookmarks.push(
    {
      ...plan.bookmarks[0]!,
      input: { ...plan.bookmarks[0]!.input, url: 'https://example.com/#part' },
    },
    {
      ...plan.bookmarks[0]!,
      input: { ...plan.bookmarks[0]!.input, url: 'https://example.com/?a=1' },
    },
  );
  await repository.import(plan);
  plan.bookmarks[0]!.input.description = 'Changed imported text';
  await repository.import(plan);
  expect(await database.bookmarks.count()).toBe(3);
  expect(
    (await database.bookmarks.toArray()).find(
      (bookmark) => bookmark.url === 'https://example.com/',
    )?.description,
  ).toBe('A description');
});
it('rejects unsafe URLs, invalid dates, excessive depth and invalid parent references before writing', async () => {
  const unsafe = fixture();
  unsafe.bookmarks[0]!.input.url = 'javascript:alert(1)';
  await expect(repository.import(unsafe)).rejects.toThrow('http');
  const missing = fixture();
  missing.bookmarks[0]!.folder = 99;
  expect(() => validateHtmlImport(missing)).toThrow('missing folder');
  const cycle = fixture();
  cycle.folders[0]!.parent = 1;
  expect(() => validateHtmlImport(cycle)).toThrow('hierarchy');
  const deep = fixture();
  deep.folders = Array.from({ length: 33 }, (_, index) => ({
    name: String(index),
    ...(index ? { parent: index - 1 } : {}),
  }));
  expect(() => validateHtmlImport(deep)).toThrow('32');
  const date = fixture();
  date.bookmarks[0]!.createdAt = Infinity;
  expect(() => validateHtmlImport(date)).toThrow('date');
  expect(await database.folders.count()).toBe(0);
});
it('isolates other spaces and rolls back all writes if storage fails', async () => {
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'work',
      name: 'Work',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  const work = createOrganizationRepository('work', database);
  await work.saveFolder('Reading');
  function fail() {
    throw new Error('Storage failed');
  }
  database.bookmarks.hook('creating', fail);
  try {
    await expect(repository.import(fixture())).rejects.toThrow(
      'Storage failed',
    );
    expect(
      await database.folders.where('spaceId').equals('default').count(),
    ).toBe(0);
    expect(await database.bookmarks.count()).toBe(0);
  } finally {
    database.bookmarks.hook('creating').unsubscribe(fail);
  }
  await repository.import(fixture());
  expect(await database.folders.where('spaceId').equals('work').count()).toBe(
    1,
  );
  expect(
    await database.folders.where('spaceId').equals('default').count(),
  ).toBe(2);
});
it('exports nested folder structure, dates and escaped text without exposing other spaces', async () => {
  await repository.import(fixture());
  const bookmarks = createBookmarkRepository('default', database);
  await bookmarks.save({
    title: '<script> & "title"',
    url: 'https://example.com/?x=1&y=2',
    description: '<img src=x> & note',
    isFavorite: true,
  });
  const html = await repository.export();
  expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  expect(html.indexOf('Reading</H3>')).toBeLessThan(
    html.indexOf('Articles</H3>'),
  );
  expect(html).toContain('&lt;script&gt; &amp; &quot;title&quot;');
  expect(html).toContain('x=1&amp;y=2');
  expect(html).toContain('<DD>&lt;img src=x&gt; &amp; note');
  expect(html).toContain('ADD_DATE="1"');
});
it('refuses to export orphaned structures instead of silently losing records', () => {
  expect(() =>
    serializeBookmarkHtml({
      format: 'oasis',
      version: 1,
      spaceId: 'default',
      exportedAt: 1,
      folders: [],
      tags: [],
      bookmarks: [
        {
          id: 'orphan',
          spaceId: 'default',
          folderId: 'missing',
          title: 'Lost',
          url: 'https://example.com',
          tags: [],
          isFavorite: false,
          isPinned: false,
          sortOrder: 0,
          openCount: 0,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
  ).toThrow();
});
