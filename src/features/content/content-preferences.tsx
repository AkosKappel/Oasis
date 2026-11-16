import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useContentFeedback } from './use-content-feedback';
import { useAlbums } from '@/features/albums/use-albums';
import { useQuotes } from '@/features/quotes/use-quotes';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import type { ContentKind } from '@/database/content-feedback';
export function ContentPreferences({
  onClose,
  embedded = false,
}: {
  onClose: () => void;
  embedded?: boolean;
}) {
  const { contentFeedback } = useSpaceRepositories();
  const { feedback, error: loadError } = useContentFeedback();
  const { data: albums } = useAlbums(),
    { data: quotes } = useQuotes();
  const [kind, setKind] = useState<'all' | ContentKind>('all');
  const [rating, setRating] = useState('all'),
    [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100),
    [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState<string>(),
    [error, setError] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null),
    search = useRef<HTMLInputElement>(null),
    clearTrigger = useRef<HTMLButtonElement>(null);
  const focusAfterWrite = useRef(false);
  useEffect(() => {
    if (!busy && focusAfterWrite.current) {
      search.current?.focus();
      focusAfterWrite.current = false;
    }
  }, [busy]);
  const [previousFocus] = useState(document.activeElement);
  useEffect(() => {
    if (embedded) return;
    dialog.current?.showModal();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [embedded, previousFocus]);
  const rows = useMemo(() => {
    const images = new Map(
      albums?.images.map((image) => [image.id, image.name]),
    );
    const albumNames = new Map(
      albums?.albums.map((album) => [album.id, album.name]),
    );
    const imageGroups = new Map(
      albums?.images.map((image) => [image.id, albumNames.get(image.albumId)]),
    );
    const authors = new Map(
      quotes?.quotes.map((quote) => [quote.id, quote.author]),
    );
    const entries = new Map(
      quotes?.quotes.map((quote) => [
        quote.id,
        `${quote.text}${quote.author ? ` (${quote.author})` : ''}`,
      ]),
    );
    return (feedback ?? [])
      .map((record) => ({
        ...record,
        affinity:
          record.kind === 'image'
            ? imageGroups.get(record.itemId)
            : authors.get(record.itemId),
        name:
          record.kind === 'image'
            ? (images.get(record.itemId) ?? 'Saved background')
            : (entries.get(record.itemId) ?? 'Saved quote'),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  }, [feedback, albums, quotes]);
  const filtered = rows.filter(
    (row) =>
      (kind === 'all' || row.kind === kind) &&
      (rating === 'all' || row.rating === rating) &&
      row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  async function run(action: () => Promise<void>, text: string) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await action();
      storageWriteSucceeded();
      setMessage(text);
      setConfirm(false);
      focusAfterWrite.current = true;
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Preferences could not be cleared. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const Container = embedded ? 'section' : 'dialog';
  const content = (
    <Container
      ref={embedded ? undefined : dialog}
      className={embedded ? undefined : 'editor'}
      aria-labelledby="content-preferences-title"
      aria-busy={busy}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="content-preferences-title" className="text-2xl font-semibold">
          Content preferences
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Likes favor the same image and other images in its album, or quotes by
        the same author. Disliked items leave daily rotation. Ratings leave
        fixed backgrounds unchanged. These choices stay in this space, on this
        device.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Next shows another item in this tab without rating it, until reload or
        the next day. Clear a preference to make an item neutral again. Clearing
        does not delete images or quotes.
      </p>
      <fieldset
        disabled={busy || !!loadError}
        className="mt-5 flex min-w-0 flex-col gap-4"
      >
        <label className="field">
          Find a preference
          <input
            ref={search}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(100);
            }}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="field">
            Content type
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as 'all' | ContentKind);
                setLimit(100);
                setConfirm(false);
              }}
            >
              <option value="all">All content</option>
              <option value="image">Backgrounds</option>
              <option value="quote">Quotes</option>
            </select>
          </label>
          <label className="field">
            Preference
            <select
              value={rating}
              onChange={(event) => {
                setRating(event.target.value);
                setLimit(100);
              }}
            >
              <option value="all">All preferences</option>
              <option value="like">Liked</option>
              <option value="dislike">Disliked</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.filter((row) => row.rating === 'like').length} liked,{' '}
          {rows.filter((row) => row.rating === 'dislike').length} disliked.
        </p>
        <ul
          aria-label="Saved content preferences"
          className="flex flex-col gap-3"
        >
          {filtered.slice(0, limit).map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="line-clamp-3 break-words text-sm">{row.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.kind === 'image' ? 'Background' : 'Quote'} ·{' '}
                  {row.rating === 'like' ? 'Liked' : 'Disliked'}
                </p>
                {row.affinity && (
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {row.kind === 'image' ? 'Album' : 'Author'}: {row.affinity}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                aria-label={`Clear preference for ${row.name.slice(0, 100)}`}
                onClick={() =>
                  void run(
                    () => contentFeedback.clear(row.id),
                    'Preference cleared.',
                  )
                }
              >
                Clear
              </Button>
            </li>
          ))}
        </ul>
        {!feedback && !loadError && <p role="status">Loading preferences…</p>}
        {feedback && !filtered.length && (
          <p className="text-sm text-muted-foreground">
            {rows.length
              ? 'No preferences match these filters.'
              : 'No saved preferences. Like or dislike a background or quote on Home to get started.'}
          </p>
        )}
        {filtered.length > limit && (
          <Button
            variant="outline"
            onClick={() => setLimit((value) => value + 100)}
          >
            Show more preferences
          </Button>
        )}
        {!confirm ? (
          <Button
            ref={clearTrigger}
            variant="outline"
            disabled={!rows.some((row) => kind === 'all' || row.kind === kind)}
            onClick={() => setConfirm(true)}
          >
            Clear{' '}
            {kind === 'all' ? 'all' : kind === 'image' ? 'background' : 'quote'}{' '}
            preferences
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm">
              Clear{' '}
              {kind === 'all'
                ? 'all saved content'
                : kind === 'image'
                  ? 'all background'
                  : 'all quote'}{' '}
              preferences in this space? This includes choices hidden by search
              or rating filters.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                autoFocus
                onClick={() =>
                  void run(
                    () =>
                      contentFeedback.reset(kind === 'all' ? undefined : kind),
                    'Preferences cleared.',
                  )
                }
              >
                Confirm clear preferences
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setConfirm(false);
                  requestAnimationFrame(() => clearTrigger.current?.focus());
                }}
              >
                Cancel clear
              </Button>
            </div>
          </div>
        )}
      </fieldset>
      {(loadError || error) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {loadError || error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </Container>
  );
  return embedded ? content : createPortal(content, document.body);
}
