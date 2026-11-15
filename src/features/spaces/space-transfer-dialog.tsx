import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useSpace,
  useSpaceRepositories,
} from '@/features/spaces/space-context';
import type { TransferReview } from '@/database/space-transfer';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
export function SpaceTransferDialog({
  ids,
  onClose,
  onComplete,
}: {
  ids: string[];
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const { spaceId, list } = useSpace();
  const { spaceTransfers } = useSpaceRepositories();
  const [selection] = useState(ids);
  const [target, setTarget] = useState(
    list.find((space) => space.id !== spaceId)?.id ?? '',
  );
  const [mode, setMode] = useState<'copy' | 'move'>('copy');
  const [review, setReview] = useState<TransferReview>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (!review)
        setReview(await spaceTransfers.preview(selection, target, mode));
      else {
        const result = await spaceTransfers.apply(review);
        storageWriteSucceeded();
        onComplete(
          `${mode === 'copy' ? 'Copied' : 'Moved'} ${result.bookmarks} ${result.bookmarks === 1 ? 'bookmark' : 'bookmarks'} to ${list.find((space) => space.id === target)?.name ?? 'the destination'}.`,
        );
      }
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The transfer could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="transfer-title"
      className="editor"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <h2 id="transfer-title" className="text-2xl font-semibold">
        Transfer to another space
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Selected bookmarks: {selection.length}. Folder paths and matching tag
        names are reused. Notes and favorites are kept; destination open counts
        start at zero. Existing destination bookmarks stay unchanged, so
        repeated URLs are possible.
      </p>
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy} className="flex flex-col gap-4">
          <label className="field">
            Destination space
            <select
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setReview(undefined);
              }}
            >
              <option value="" disabled>
                Choose a space
              </option>
              {list
                .filter((space) => space.id !== spaceId)
                .map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Transfer action
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as 'copy' | 'move');
                setReview(undefined);
              }}
            >
              <option value="copy">Copy, keep originals</option>
              <option value="move">
                Move, remove originals from this space
              </option>
            </select>
          </label>
          {!target && (
            <p className="text-sm">
              Create another space before transferring bookmarks.
            </p>
          )}
          {review && (
            <section
              aria-label="Transfer review"
              className="rounded-lg border border-border p-3 text-sm"
            >
              <h3 className="font-semibold">Review before saving</h3>
              <p className="mt-2">
                {review.summary.bookmarks}{' '}
                {review.summary.bookmarks === 1 ? 'bookmark' : 'bookmarks'};{' '}
                {review.summary.newFolders} new folders and{' '}
                {review.summary.reusedFolders} reused folders;{' '}
                {review.summary.newTags} new tags and{' '}
                {review.summary.reusedTags} reused tags.
              </p>
              <p className="mt-2">
                {mode === 'move'
                  ? 'Original bookmarks are removed from this space only after the destination is saved successfully.'
                  : 'Original bookmarks remain in this space.'}{' '}
                Matching destination tag colors stay unchanged.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setReview(undefined)}
              >
                Change or refresh review
              </Button>
            </section>
          )}
        </fieldset>
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
          <Button disabled={busy || !target}>
            {review
              ? mode === 'copy'
                ? 'Copy bookmarks'
                : 'Move bookmarks'
              : 'Review transfer'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
