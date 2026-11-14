import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { duplicateGroups, personalDuplicates } from '@/database/duplicates';
import { reportStorageError } from '@/database/storage-health';
import { folderPaths } from '@/features/organization/folder-tree';
import type { Bookmark, Folder } from '@/types/entities';
function DuplicateGroup({
  url,
  bookmarks,
  folders,
  busy,
  onRemove,
}: {
  url: string;
  bookmarks: Bookmark[];
  folders: Map<string, string>;
  busy: boolean;
  onRemove: (keeper: Bookmark, copies: Bookmark[]) => Promise<boolean>;
}) {
  const [keeperId, setKeeperId] = useState(bookmarks[0]!.id),
    [selected, setSelected] = useState<Set<string>>(() => new Set());
  const keeper =
    bookmarks.find((item) => item.id === keeperId) ?? bookmarks[0]!;
  const copies = bookmarks.filter(
    (item) => item.id !== keeper.id && selected.has(item.id),
  );
  return (
    <li className="min-w-0 rounded-lg border border-border p-4">
      <h3 className="break-all text-sm font-medium">{url}</h3>
      <label className="field mt-3">
        Keep bookmark
        <select
          value={keeper.id}
          disabled={busy}
          onChange={(event) => {
            setKeeperId(event.target.value);
            setSelected(new Set());
          }}
        >
          {bookmarks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} ({folders.get(item.folderId ?? '') ?? 'Unorganized'})
            </option>
          ))}
        </select>
      </label>
      <ul className="mt-3 flex flex-col gap-3">
        {bookmarks.map((item) => (
          <li key={item.id} className="min-w-0">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                disabled={busy || item.id === keeper.id}
                checked={item.id !== keeper.id && selected.has(item.id)}
                aria-label={`Remove copy ${item.title}`}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(item.id);
                  else next.delete(item.id);
                  setSelected(next);
                }}
              />
              <span className="min-w-0">
                <span className="block break-words text-sm">
                  {item.title}
                  {item.id === keeper.id ? ' · Kept' : ''}
                </span>
                <span className="mt-1 block break-words text-xs text-muted-foreground">
                  {folders.get(item.folderId ?? '') ?? 'Unorganized'}
                  {item.isFavorite ? ' · Favorite' : ''}
                  {item.tags.length ? ` · ${item.tags.length} tags` : ''}
                </span>
                {item.description && (
                  <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
                {item.notes && (
                  <span className="mt-1 block whitespace-pre-wrap break-words text-xs">
                    Notes: {item.notes}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        className="mt-4"
        size="sm"
        variant="outline"
        disabled={busy || !copies.length}
        onClick={() => {
          if (
            window.confirm(
              `Delete ${copies.length} selected copies, including their notes? “${keeper.title}” stays unchanged.`,
            )
          )
            void onRemove(keeper, copies).then((removed) => {
              if (removed) setSelected(new Set());
            });
        }}
      >
        Delete selected copies
      </Button>
    </li>
  );
}
export function DuplicateReview({
  bookmarks,
  folders,
  onClose,
}: {
  bookmarks: Bookmark[];
  folders: Folder[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    done = useRef<HTMLButtonElement>(null),
    previous = useRef(document.activeElement);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState('');
  const groups = duplicateGroups(bookmarks),
    paths = folderPaths(folders);
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function remove(keeper: Bookmark, copies: Bookmark[]) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await personalDuplicates.removeCopies(keeper, copies);
      setMessage('Selected copies deleted. The kept bookmark is unchanged.');
      requestAnimationFrame(() => done.current?.focus());
      return true;
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Copies could not be deleted. Your selection is kept.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="editor !max-w-3xl"
      aria-labelledby="duplicate-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="duplicate-title" className="text-2xl font-semibold">
          Review duplicates
        </h2>
        <Button ref={done} variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Matching URLs across your whole Library. Protocol, query parameters,
        fragments and trailing path slashes stay distinct. Nothing is removed
        automatically.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Choose a bookmark to keep, then select copies to delete. Notes, tags and
        folders are not merged. Download a bookmark backup first if you want a
        portable copy.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      {!groups.length ? (
        <p className="mt-6">No duplicate URLs found.</p>
      ) : (
        <>
          <p className="mt-4 text-sm">
            {groups.length} matching URL{' '}
            {groups.length === 1 ? 'group' : 'groups'}.{' '}
            {groups.length > 100
              ? 'Showing the first 100 groups. Review more after cleanup.'
              : ''}
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {groups.slice(0, 100).map((group) => (
              <DuplicateGroup
                key={group.url}
                {...group}
                folders={paths}
                busy={busy}
                onRemove={remove}
              />
            ))}
          </ul>
        </>
      )}
    </dialog>
  );
}
