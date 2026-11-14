import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { personalBookmarks } from '@/database/bookmarks';
import type { Bookmark } from '@/types/entities';
import { Button } from '@/components/ui/button';

interface BookmarkEditorProps {
  bookmark?: Bookmark;
  onClose: () => void;
}

export function BookmarkEditor({ bookmark, onClose }: BookmarkEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
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
        },
        bookmark?.id,
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your bookmark could not be saved. Try again.',
      );
      setSaving(false);
    }
  }

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
              defaultValue={bookmark?.title}
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
              defaultValue={bookmark?.url}
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
          <label className="field">
            Description{' '}
            <span className="text-xs font-normal text-muted-foreground">
              Optional
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={bookmark?.description}
              placeholder="What makes this worth saving?"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isFavorite"
              defaultChecked={bookmark?.isFavorite}
              className="size-4 accent-primary"
            />{' '}
            Add to favorites
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
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
    </dialog>
  );
}
