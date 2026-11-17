import { normalizePageText } from '@/database/page-texts';
import type { TagSuggestion } from '@/database/tag-suggestions';
import { safeBookmarkMedia } from '@/database/bookmark-media';
import type { PageDetails } from '@/features/capture/read-page-details';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useEffect, useMemo, useRef, useState, type SubmitEvent } from 'react';
import { type BookmarkInput } from '@/database/bookmarks';
import type { Bookmark, Folder, Tag } from '@/types/entities';
import { folderOptions } from '@/features/organization/folder-tree';
import { Button } from '@/components/ui/button';

interface BookmarkEditorProps {
  onReadDetails?: (url: string) => Promise<PageDetails>;
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
  onReadDetails,
  embedded = false,
  initialValues,
  onSaved,
  folders,
  tags,
  defaultFolderId,
  onClose,
}: BookmarkEditorProps) {
  const { personalBookmarks, pageTexts } = useSpaceRepositories();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>();
  const [suggestionMessage, setSuggestionMessage] = useState<string>();
  const [selectedTags, setSelectedTags] = useState(
    bookmark?.tags ?? initialValues?.tags ?? [],
  );
  async function suggestTags() {
    if (!formRef.current || saving || reading || suggesting) return;
    setSuggesting(true);
    setError(undefined);
    setSuggestionMessage(undefined);
    setSuggestions(undefined);
    try {
      const url = String(new FormData(formRef.current).get('url') ?? '');
      const result = await personalBookmarks.suggestTags(url, bookmark?.id);
      setSuggestions(result);
      setSuggestionMessage(
        result.length
          ? 'Choose suggestions before saving.'
          : 'No tags were found on other saved bookmarks from this website.',
      );
    } catch (cause) {
      reportStorageError(cause, true);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Tags could not be suggested. Try again.',
      );
    } finally {
      setSuggesting(false);
    }
  }
  const [reading, setReading] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string>();
  const [description, setDescription] = useState(
    bookmark?.description ?? initialValues?.description ?? '',
  );
  const [media, setMedia] = useState({
    favicon: bookmark?.favicon,
    image: bookmark?.image,
  });
  const localIcon = useMemo(
    () => safeBookmarkMedia(media.favicon, 'icon'),
    [media.favicon],
  );
  const localPreview = useMemo(
    () => safeBookmarkMedia(media.image, 'preview'),
    [media.image],
  );
  const [mediaChanged, setMediaChanged] = useState(false);
  const [pageText, setPageText] = useState('');
  const [keepText, setKeepText] = useState(false);
  const [savedId, setSavedId] = useState(bookmark?.id);
  async function readDetails() {
    if (!onReadDetails || !formRef.current || reading || saving) return;
    const url = String(new FormData(formRef.current).get('url') ?? '');
    setReading(true);
    setError(undefined);
    setDetailsMessage(undefined);
    try {
      const result = await onReadDetails(url);
      setDescription((value) => (value.trim() ? value : result.description));
      setMedia((value) => ({
        favicon: result.favicon ?? value.favicon,
        image: result.image ?? value.image,
      }));
      setMediaChanged(true);
      setPageText(normalizePageText(result.text ?? ''));
      setDetailsMessage(
        result.description || result.favicon || result.image
          ? 'Page details read. Review before saving.'
          : 'No supported page details were found. You can enter a description yourself.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Page details could not be read. Try again.',
      );
    } finally {
      setReading(false);
    }
  }
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
    if (saving || reading || suggesting) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError(undefined);
    try {
      const id = await personalBookmarks.save(
        {
          ...(mediaChanged
            ? {
                ...(media.favicon !== bookmark?.favicon
                  ? { favicon: media.favicon }
                  : {}),
                ...(media.image !== bookmark?.image
                  ? { image: media.image }
                  : {}),
              }
            : {}),
          customIcon: String(data.get('customIcon') ?? ''),
          title: String(data.get('title') ?? ''),
          url: String(data.get('url') ?? ''),
          description: String(data.get('description') ?? ''),
          isFavorite: data.get('isFavorite') === 'on',
          folderId: String(data.get('folderId') ?? ''),
          tags: data.getAll('tags').map(String),
        },
        savedId,
      );
      // Remember the new ID so a retry after a page-text failure edits instead of duplicating.
      setSavedId(id);
      if (keepText && pageText) await pageTexts.save(id, pageText);
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Bookmark library</p>
        <h2 id="editor-title" className="mt-2 text-2xl font-semibold">
          {bookmark ? 'Edit bookmark' : 'Save a bookmark'}
        </h2>
      </div>
      <fieldset
        disabled={saving || reading || suggesting}
        className="flex min-w-0 flex-col gap-4"
      >
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
          <label htmlFor="bookmark-custom-icon">Custom icon</label>
          <input
            id="bookmark-custom-icon"
            name="customIcon"
            maxLength={16}
            defaultValue={bookmark?.customIcon}
            placeholder="Emoji or short label"
            aria-describedby="custom-icon-help"
          />
          <span
            id="custom-icon-help"
            className="text-xs font-normal text-muted-foreground"
          >
            Optional. Leave blank to use the saved favicon or title initial.
          </span>
        </div>
        <div className="field">
          <label htmlFor="bookmark-url">URL</label>
          <input
            id="bookmark-url"
            onChange={() => {
              setSuggestions(undefined);
              setSuggestionMessage(undefined);
            }}
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
        {(!embedded || onReadDetails) && (
          <label className="field">
            Description{' '}
            <span className="text-xs font-normal text-muted-foreground">
              Optional
            </span>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What makes this worth saving?"
            />
          </label>
        )}
        {onReadDetails && (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void readDetails()}
            >
              {reading ? 'Reading page details…' : 'Read page details'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Optional access reads this page’s description and caches small
              images from the same website. No third-party lookup.
            </p>
            {!!pageText && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={keepText}
                  onChange={(event) => setKeepText(event.target.checked)}
                />
                <span>
                  Keep a text copy of this page (
                  {pageText.length.toLocaleString()} characters)
                  <span className="block text-xs text-muted-foreground">
                    Stored only in this browser. Read it, search it and add
                    highlights from Library.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
        {(localIcon || localPreview) && (
          <div className="flex flex-wrap items-start gap-3">
            {localIcon && (
              <img
                src={localIcon}
                alt="Page icon to save"
                className="size-10 rounded object-contain"
              />
            )}
            {localPreview && (
              <img
                src={localPreview}
                alt="Page preview to save"
                className="max-h-32 max-w-full rounded object-contain"
              />
            )}
          </div>
        )}
        {(media.favicon || media.image) && (
          <div className="flex flex-wrap gap-2">
            {media.favicon && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMedia((value) => ({ ...value, favicon: undefined }));
                  setMediaChanged(true);
                }}
              >
                Remove saved icon
              </Button>
            )}
            {media.image && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMedia((value) => ({ ...value, image: undefined }));
                  setMediaChanged(true);
                }}
              >
                Remove saved preview
              </Button>
            )}
          </div>
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
                    checked={selectedTags.includes(tag.id)}
                    onChange={(event) =>
                      setSelectedTags((value) =>
                        event.target.checked
                          ? [...new Set([...value, tag.id])]
                          : value.filter((id) => id !== tag.id),
                      )
                    }
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
          {tags.length > 0 && (
            <div className="mt-4 space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void suggestTags()}
              >
                {suggesting ? 'Finding suggestions…' : 'Suggest tags'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Based on tags you’ve used on this website.
              </p>
              {suggestionMessage && (
                <p role="status" className="text-sm text-muted-foreground">
                  {suggestionMessage}
                </p>
              )}
              {!!suggestions?.length && (
                <ul aria-label="Suggested tags" className="flex flex-col gap-2">
                  {suggestions
                    .filter((item) =>
                      tags.some(
                        (tag) =>
                          tag.id === item.tag.id && tag.name === item.tag.name,
                      ),
                    )
                    .map((item) => (
                      <li
                        key={item.tag.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto min-h-9 max-w-full text-left"
                          disabled={selectedTags.includes(item.tag.id)}
                          onClick={() =>
                            setSelectedTags((value) => [
                              ...new Set([...value, item.tag.id]),
                            ])
                          }
                        >
                          <span className="min-w-0 break-words">
                            {selectedTags.includes(item.tag.id)
                              ? 'Added'
                              : 'Add'}{' '}
                            {item.tag.name}
                          </span>
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {item.uses} of {item.bookmarks}{' '}
                          {item.bookmarks === 1 ? 'bookmark' : 'bookmarks'}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
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
      {detailsMessage && (
        <p role="status" className="text-sm text-muted-foreground">
          {detailsMessage}
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
          onClick={onClose}
          disabled={saving || reading || suggesting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || reading || suggesting}>
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
        if (saving || reading || suggesting) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="editor-title"
      className="editor"
    >
      {form}
    </dialog>
  );
}
