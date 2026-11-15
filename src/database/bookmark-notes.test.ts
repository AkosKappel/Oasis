import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createBookmarkRepository } from './bookmarks';
import {
  createBookmarkNotesRepository,
  MAX_NOTE_LENGTH,
} from './bookmark-notes';
import { createBackupRepository } from './backup';
const database = new OasisDatabase('notes-test'),
  bookmarks = createBookmarkRepository('default', database),
  notes = createBookmarkNotesRepository('default', database);
afterEach(() => database.delete());
async function seed() {
  await database.open();
  return bookmarks.save({
    title: 'Reference',
    url: 'https://example.com',
    description: 'Keep this',
    isFavorite: true,
  });
}
it('updates only notes, normalizes lines, clears explicitly and round trips JSON backups', async () => {
  const id = await seed();
  await notes.save(id, '  Indented\r\n<script>literal text</script>  ', '');
  const saved = (await database.bookmarks.get(id))!;
  expect(saved).toMatchObject({
    title: 'Reference',
    description: 'Keep this',
    isFavorite: true,
    notes: '  Indented\n<script>literal text</script>  ',
  });
  const backup = await createBackupRepository(database).export();
  const fresh = new OasisDatabase('notes-restored-test');
  try {
    await fresh.open();
    await createBackupRepository(fresh).restore(
      JSON.parse(JSON.stringify(backup)),
    );
    expect((await fresh.bookmarks.get(id))?.notes).toBe(saved.notes);
  } finally {
    await fresh.delete();
  }
  await notes.save(id, '  \n ', saved.notes!);
  expect((await database.bookmarks.get(id))?.notes).toBe('');
});
it('rejects conflicting notes, foreign records and changes above the limit without losing drafts', async () => {
  const id = await seed();
  await notes.save(id, 'Other tab', '');
  await expect(notes.save(id, 'My draft', '')).rejects.toThrow('another tab');
  await expect(
    notes.save(id, 'x'.repeat(MAX_NOTE_LENGTH + 1), 'Other tab'),
  ).rejects.toThrow('20,000');
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'other',
      name: 'Other',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(
    createBookmarkNotesRepository('other', database).save(
      id,
      'Foreign',
      'Other tab',
    ),
  ).rejects.toThrow('bookmark');
  expect((await database.bookmarks.get(id))?.notes).toBe('Other tab');
  const long = 'x'.repeat(MAX_NOTE_LENGTH + 1);
  await database.transaction('rw', database.bookmarks, () =>
    database.bookmarks.update(id, { notes: long }),
  );
  await notes.save(id, long, long);
  expect((await database.bookmarks.get(id))?.notes).toBe(long);
});
it('keeps notes intact on failed writes and preserves concurrent edits to other fields', async () => {
  const id = await seed();
  await database.transaction('rw', database.bookmarks, () =>
    database.bookmarks.update(id, { title: 'Renamed elsewhere' }),
  );
  const fail = () => {
    throw new Error('Quota exceeded');
  };
  database.bookmarks.hook('updating', fail);
  try {
    await expect(notes.save(id, 'Draft', '')).rejects.toThrow('Quota');
  } finally {
    database.bookmarks.hook('updating').unsubscribe(fail);
  }
  expect((await database.bookmarks.get(id))?.notes).toBeUndefined();
  await notes.save(id, 'Draft', '');
  expect((await database.bookmarks.get(id))?.title).toBe('Renamed elsewhere');
});
