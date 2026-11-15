import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
export const MAX_NOTE_LENGTH = 20_000;
function normalized(value: string) {
  return value.trim() ? value.replace(/\r\n?/g, '\n') : '';
}
export function createBookmarkNotesRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async save(id: string, input: string, expectedNotes: string) {
      if (typeof input !== 'string' || typeof expectedNotes !== 'string')
        throw new Error('Use plain text for notes.');
      const notes = normalized(input);
      await database.transaction(
        'rw',
        database.spaces,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await requireOwnedRecord(
            database.bookmarks,
            id,
            spaceId,
            'bookmark',
          );
          if ((existing.notes ?? '') !== expectedNotes)
            throw new Error(
              'Notes changed in another tab. Copy your draft and reopen Notes to review the latest version.',
            );
          if (
            notes.length > MAX_NOTE_LENGTH &&
            notes !== normalized(existing.notes ?? '')
          )
            throw new Error(
              'Keep new notes within 20,000 characters. Your saved note is unchanged.',
            );
          await database.bookmarks.update(id, { notes, updatedAt: Date.now() });
        },
      );
    },
  };
}
export const personalBookmarkNotes = createBookmarkNotesRepository('default');
