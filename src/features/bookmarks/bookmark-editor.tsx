import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { personalBookmarks, type BookmarkInput } from '@/database/bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { folderOptions } from '@/features/organization/folder-tree';
import { Button } from '@/components/ui/button';

interface BookmarkEditorProps {
  embedded?: boolean;
  initialValues?: BookmarkInput;
  onSaved?: () => void;
  bookmark?: Bookmark;
  onClose: () => void;
  folders: Folder[];
  tags: Tag[];
  defaultFolderId?: string;
}

export function BookmarkEditor({
  bookmark,
  embedded = false,
  initialValues,
  onSaved,
  folders,
  tags,
  defaultFolderId,
  onClose,
}: BookmarkEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const previousFocus = useRef(document.activeElement);
  useEffect(() => {
    const previous = previousFocus.current;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError(undefined);
    try {
      await personalBookmarks.save(
        {
          title: String(data.get('title') ?? ''),
          url: String(data.get('url') ?? ''),
          description: String(data.get('description') ?? ''),
          isFavorite: data.get('isFavorite') === 'on',
          folderId: String(data.get('folderId') ?? ''),
          tags: data.getAll('tags').map(String),
        },
        bookmark?.id,
      );
      storageWriteSucceeded();
      if (onSaved) onSaved();
      else onClose();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your bookmark could not be saved. Try again.',
      );
      setSaving(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Personal library</p>
        <h2 id="editor-title" className="mt-2 text-2xl font-semibold">
          {bookmark ? 'Edit bookmark' : 'Save a bookmark'}
        </h2>
      </div>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
        <label className="field">
          Title
          <input
            name="title"
            required
            autoFocus
            defaultValue={bookmark?.title ?? initialValues?.title}
            placeholder="A name to remember"
          />
        </label>
        <div className="field">
          <label htmlFor="bookmark-url">URL</label>
          <input
            id="bookmark-url"
            name="url"
            type="url"
            required
            defaultValue={bookmark?.url ?? initialValues?.url}
            placeholder="https://example.com"
            aria-describedby="url-help"
          />
          <span
            id="url-help"
            className="text-xs font-normal text-muted-foreground"
          >
            Use a complete http:// or https:// address.
          </span>
        </div>
        {!embedded && (
          <label className="field">
            Description{' '}
            <span className="text-xs font-normal text-muted-foreground">
              Optional
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={bookmark?.description ?? initialValues?.description}
              placeholder="What makes this worth saving?"
            />
          </label>
        )}
        <label className="field">
          Folder
          <select
            name="folderId"
            defaultValue={bookmark?.folderId ?? defaultFolderId ?? ''}
          >
            <option value="">Unorganized</option>
            {folderOptions(folders).map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Tags</legend>
          {tags.length ? (
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex min-w-0 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag.id}
                    defaultChecked={bookmark?.tags.includes(tag.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span
                    className="size-2 shrink-0 rounded-full border border-black/15"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                  <span className="break-words">{tag.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create tags in “Folders and tags” to organize your bookmarks.
            </p>
          )}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFavorite"
            defaultChecked={bookmark?.isFavorite ?? initialValues?.isFavorite}
            className="size-4 accent-primary"
          />{' '}
          Add to favorites
        </label>
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
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save bookmark'}
        </Button>
      </div>
    </form>
  );
  if (embedded) return form;

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="editor-title"
      className="editor"
    >
      {form}
    </dialog>
  );
}
