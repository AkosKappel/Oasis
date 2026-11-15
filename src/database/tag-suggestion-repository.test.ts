import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('tag-suggestion-repository');
afterEach(() => database.delete());
it('suggests from an owned read snapshot without writing or including the edited bookmark', async () => {
  await database.open();
  const org = createOrganizationRepository('default', database);
  const tag = await org.saveTag({ name: 'Reference', color: '#336699' });
  const repo = createBookmarkRepository('default', database);
  const input = {
    title: 'Guide',
    url: 'https://example.com/guide',
    description: '',
    isFavorite: false,
    tags: [tag],
  };
  const id = await repo.save(input);
  const before = await database.bookmarks.toArray();
  expect((await repo.suggestTags('https://example.com/new'))[0]).toMatchObject({
    tag: { id: tag },
    uses: 1,
    bookmarks: 1,
  });
  expect(await repo.suggestTags(input.url, id)).toEqual([]);
  expect(await database.bookmarks.toArray()).toEqual(before);
  const other = await createSpaceRepository(database).save('Other');
  await expect(
    createBookmarkRepository(other, database).suggestTags(input.url, id),
  ).rejects.toThrow();
  expect(
    await createBookmarkRepository(other, database).suggestTags(input.url),
  ).toEqual([]);
  await repo.remove(id);
  expect(await repo.suggestTags(input.url)).toEqual([]);
});
