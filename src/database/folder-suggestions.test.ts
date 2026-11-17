import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { savableUrl } from '@/features/search/command-palette';
const database = new OasisDatabase('folder-suggestions-test');
const bookmarks = createBookmarkRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
const save = (title: string, url: string, folderId?: string) =>
  bookmarks.save({ title, url, description: '', isFavorite: false, folderId });

it('suggests folders that hold bookmarks from the same website', async () => {
  const organization = createOrganizationRepository('default', database);
  const docs = await organization.saveFolder('Docs');
  const misc = await organization.saveFolder('Misc');
  await save('A', 'https://docs.example/a', docs);
  await save('B', 'https://docs.example/b', docs);
  await save('C', 'https://docs.example/c', misc);
  await save('D', 'https://docs.example/d');
  await save('E', 'https://other.example/e', misc);
  const editing = await save('F', 'https://docs.example/f', misc);
  const suggestions = await bookmarks.suggestFolders(
    'https://docs.example/new',
    editing,
  );
  expect(
    suggestions.map((item) => [item.folder.name, item.uses, item.bookmarks]),
  ).toEqual([
    ['Docs', 2, 4],
    ['Misc', 1, 4],
  ]);
  await organization.removeFolder(docs);
  expect(
    (await bookmarks.suggestFolders('https://docs.example/new')).map(
      (item) => item.folder.name,
    ),
  ).toEqual(['Misc']);
  await expect(bookmarks.suggestFolders('not a url')).rejects.toThrow(
    'complete http',
  );
});

it('recognizes only pasted http(s) addresses without credentials as savable', () => {
  expect(savableUrl(' https://example.com/a?b=1 ')).toBe(
    'https://example.com/a?b=1',
  );
  expect(savableUrl('javascript:alert(1)')).toBeUndefined();
  expect(savableUrl('https://user:pass@example.com')).toBeUndefined();
  expect(savableUrl('example.com')).toBeUndefined();
});
