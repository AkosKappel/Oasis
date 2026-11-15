import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_NOTE_LENGTH } from '@/database/bookmark-notes';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import type { Bookmark } from '@/types/entities';
export function BookmarkNotesEditor({
  bookmark,
  onClose,
}: {
  bookmark: Bookmark;
  onClose: () => void;
}) {
  const { personalBookmarkNotes } = useSpaceRepositories();
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const [draft, setDraft] = useState(
      (bookmark.notes ?? '').replace(/\r\n?/g, '\n'),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="editor !max-w-2xl"
      aria-labelledby="notes-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <h2 id="notes-title" className="text-2xl font-semibold">
        Bookmark notes
      </h2>
      <p className="mt-2 break-words text-sm text-muted-foreground">
        {bookmark.title}
      </p>
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(undefined);
          void personalBookmarkNotes
            .save(bookmark.id, draft, bookmark.notes ?? '')
            .then(() => {
              storageWriteSucceeded();
              onClose();
            })
            .catch((cause: unknown) => {
              reportStorageError(cause);
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Your notes could not be saved. Try again.',
              );
              setBusy(false);
            });
        }}
      >
        <label className="field">
          Notes
          <textarea
            autoFocus
            rows={10}
            maxLength={MAX_NOTE_LENGTH}
            aria-describedby="notes-help"
            disabled={busy}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What do you want to remember about this page?"
            className="min-h-48 resize-y"
          />
        </label>
        <p id="notes-help" className="text-xs text-muted-foreground">
          Plain text, searchable in Library and included in Oasis JSON backups.
          Clear the field and save to remove a note.
        </p>
        <p className="text-xs text-muted-foreground">
          {draft.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()}{' '}
          characters
        </p>
        {draft.length > MAX_NOTE_LENGTH && (
          <p className="text-sm">
            This imported note is longer than the editor limit. Saving it
            unchanged keeps it intact; copy it before shortening.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={busy}>Save notes</Button>
        </div>
      </form>
    </dialog>
  );
}
