import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createQuoteRepository,
  validateQuote,
  validateQuoteArchive,
} from './quotes';
const database = new OasisDatabase('quotes-test');
const repository = createQuoteRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
it('validates, edits and selects quotes without changing their IDs', async () => {
  const collection = await repository.saveCollection(' Reminders ');
  const id = await repository.saveQuote(collection, {
    text: ' Make room for what matters. ',
    author: '',
  });
  await repository.saveQuote(
    collection,
    { text: 'Keep it simple.', author: 'Personal note' },
    id,
  );
  await repository.setDisplay(collection, true);
  expect((await repository.list()).quotes[0]).toMatchObject({
    id,
    text: 'Keep it simple.',
    author: 'Personal note',
  });
  expect((await repository.list()).settings).toMatchObject({
    collectionId: collection,
    visible: true,
  });
  expect(() => validateQuote({ text: ' ', author: '' })).toThrow();
  expect(() => validateQuote({ text: 'x'.repeat(501), author: '' })).toThrow();
  await expect(repository.saveCollection('reminders')).rejects.toThrow(
    'already exists',
  );
});
it('protects cross-space references and soft-deletes collections and their entries', async () => {
  const collection = await repository.saveCollection('Reminders');
  const id = await repository.saveQuote(collection, {
    text: 'A note',
    author: '',
  });
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'work',
      name: 'Work',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  const foreign = createQuoteRepository('work', database);
  await expect(
    foreign.saveQuote(collection, { text: 'Other', author: '' }),
  ).rejects.toThrow('collection');
  await repository.setDisplay(collection, true);
  await repository.remove(collection, 'collection');
  expect((await repository.list()).quotes).toEqual([]);
  expect((await database.quotes.get(id))?.deletedAt).toBeTypeOf('number');
  expect((await repository.list()).settings?.visible).toBe(false);
});
it('restores quote archives into a fresh profile and rejects dangling references', async () => {
  const collection = await repository.saveCollection('Reminders');
  await repository.saveQuote(collection, {
    text: '<script>plain text</script>',
    author: 'Me',
  });
  const archive = await repository.export();
  const fresh = new OasisDatabase('quotes-fresh-test');
  try {
    await fresh.open();
    const target = createQuoteRepository('default', fresh);
    await target.restore(archive);
    await target.restore(archive);
    expect(await target.export()).toEqual(archive);
  } finally {
    await fresh.delete();
  }
  const invalid = structuredClone(archive);
  invalid.quotes[0]!.collectionId = 'missing';
  expect(() => validateQuoteArchive(invalid)).toThrow('missing');
});
it('rolls back archive additions on storage failure and rejects deleted IDs', async () => {
  const archive = {
    format: 'oasis-quotes' as const,
    version: 1 as const,
    collections: [
      {
        id: 'c',
        spaceId: 'default',
        name: 'Reminders',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    quotes: [
      {
        id: 'q',
        spaceId: 'default',
        collectionId: 'c',
        text: 'A note',
        author: '',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
  function fail() {
    throw new Error('Storage failed');
  }
  database.quotes.hook('creating', fail);
  try {
    await expect(repository.restore(archive)).rejects.toThrow('Storage failed');
    expect(await database.quoteCollections.count()).toBe(0);
  } finally {
    database.quotes.hook('creating').unsubscribe(fail);
  }
  await repository.restore(archive);
  await repository.remove('q', 'quote');
  await expect(repository.restore(archive)).rejects.toThrow('unavailable');
});
