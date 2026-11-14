import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Folder, Tag } from '@/types/entities';
import type { BulkBookmarkAction } from '@/database/bookmarks';
import { folderOptions } from '@/features/organization/folder-tree';
export function BulkEditor({
  kind,
  count,
  folders,
  tags,
  onApply,
  onClose,
}: {
  kind: 'move' | 'tags';
  count: number;
  folders: Folder[];
  tags: Tag[];
  onApply: (action: BulkBookmarkAction) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="editor"
      aria-labelledby="bulk-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy(true);
          setError(undefined);
          void onApply(
            kind === 'move'
              ? { kind: 'move', folderId: String(data.get('folderId') ?? '') }
              : {
                  kind: 'tags',
                  tags: chosen,
                  mode: data.get('mode') === 'remove' ? 'remove' : 'add',
                },
          ).catch((cause) => {
            setError(
              cause instanceof Error
                ? cause.message
                : 'The selected bookmarks could not be updated.',
            );
            setBusy(false);
          });
        }}
      >
        <h2 id="bulk-title" className="text-xl font-semibold">
          {kind === 'move' ? 'Move bookmarks' : 'Tag bookmarks'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Selected bookmarks: {count}. All changes are saved together.
        </p>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
          {kind === 'move' ? (
            <label className="field">
              Move to folder
              <select name="folderId">
                <option value="">Unorganized</option>
                {folderOptions(folders).map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.path}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                Tag action
                <select name="mode">
                  <option value="add">Add tags</option>
                  <option value="remove">Remove tags</option>
                </select>
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Tags</legend>
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex min-w-0 items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(tag.id)}
                      onChange={(event) =>
                        setChosen(
                          event.target.checked
                            ? [...chosen, tag.id]
                            : chosen.filter((id) => id !== tag.id),
                        )
                      }
                    />
                    <span className="break-words">{tag.name}</span>
                  </label>
                ))}
                {!tags.length && (
                  <p className="text-sm text-muted-foreground">
                    Create tags in Folders and tags first.
                  </p>
                )}
              </fieldset>
            </>
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
          <Button disabled={busy || (kind === 'tags' && !chosen.length)}>
            {busy ? 'Saving…' : 'Apply to selected'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
