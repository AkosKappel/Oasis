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
