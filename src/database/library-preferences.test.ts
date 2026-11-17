import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createLibraryPreferencesRepository } from './library-preferences';
const database = new OasisDatabase('library-preferences-test');
const repository = createLibraryPreferencesRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
it('persists partial changes atomically without clobbering the other preference', async () => {
  expect(await repository.get()).toEqual({
    view: 'grid',
    sort: 'relevance',
    trackOpens: false,
  });
  await Promise.all([
    repository.save({ view: 'list' }),
    repository.save({ sort: 'name-asc' }),
  ]);
  expect(await repository.get()).toEqual({
    view: 'list',
    sort: 'name-asc',
    trackOpens: false,
  });
  await expect(
    repository.save({ sort: 'invalid' as 'oldest' }),
  ).rejects.toThrow('valid');
  expect(await repository.get()).toEqual({
    view: 'list',
    sort: 'name-asc',
    trackOpens: false,
  });
});
it('rejects unavailable spaces and foreign preference records', async () => {
  await database.transaction('rw', database.libraryPreferences, () =>
    database.libraryPreferences.add({
      id: 'default:library',
      spaceId: 'other',
      view: 'grid',
      sort: 'relevance',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(repository.save({ view: 'list' })).rejects.toThrow(
    'unavailable',
  );
  await expect(
    createLibraryPreferencesRepository('missing', database).get(),
  ).rejects.toThrow('space');
});

it('keeps the Links view optional and rejects unknown views', async () => {
  expect((await repository.get()).linksView).toBeUndefined();
  await repository.save({ linksView: 'tiles' });
  expect(await repository.get()).toMatchObject({
    view: 'grid',
    linksView: 'tiles',
  });
  await expect(
    repository.save({ linksView: 'desktop' as 'tiles' }),
  ).rejects.toThrow('valid');
  expect((await repository.get()).linksView).toBe('tiles');
});

it('keeps a capture folder only when it belongs to the space', async () => {
  const { createOrganizationRepository } = await import('./organization');
  const folder = await createOrganizationRepository(
    'default',
    database,
  ).saveFolder('Inbox');
  await repository.save({ captureFolderId: folder });
  expect((await repository.get()).captureFolderId).toBe(folder);
  await expect(repository.save({ captureFolderId: 'missing' })).rejects.toThrow(
    'this space',
  );
  await repository.save({ captureFolderId: undefined });
  expect((await repository.get()).captureFolderId).toBeUndefined();
});
