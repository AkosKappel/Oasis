import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { Button } from '@/components/ui/button';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import type { SavedSearch } from '@/database/saved-searches';
export function SavedSearches({
  query,
  onApply,
}: {
  query: string;
  onApply: (query: string) => void;
}) {
  const { savedSearches } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [items, setItems] = useState<SavedSearch[]>(),
    [loadError, setLoadError] = useState<string>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sub = liveQuery(() => savedSearches.list()).subscribe({
      next: (value) => {
        setItems(value);
        setLoadError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setLoadError('Saved searches could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [savedSearches, retryVersion]);
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      {!!items?.length && (
        <label className="field w-full max-w-sm">
          Load saved search
          <select
            value=""
            disabled={!!loadError}
            onChange={(event) => {
              const selected = items.find(
                (item) => item.id === event.target.value,
              );
              if (selected) onApply(selected.query);
            }}
          >
            <option value="">Choose a saved search</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button
        variant="outline"
        disabled={!items || !!loadError}
        onClick={() => setOpen(true)}
      >
        Saved searches
      </Button>
      {loadError && (
        <p role="alert" className="text-sm text-danger">
          {loadError}
        </p>
      )}
      {open && items && (
        <SavedSearchManager
          items={items}
          loadError={loadError}
          initialQuery={query}
          onApply={(value) => {
            onApply(value);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
function SavedSearchManager({
  loadError,
  items,
  initialQuery,
  onApply,
  onClose,
}: {
  loadError?: string;
  items: SavedSearch[];
  initialQuery: string;
  onApply: (query: string) => void;
  onClose: () => void;
}) {
  const { savedSearches } = useSpaceRepositories();
  const dialog = useRef<HTMLDialogElement>(null);
  const [previous] = useState(document.activeElement);
  const [editing, setEditing] = useState<SavedSearch>(),
    [name, setName] = useState(''),
    [query, setQuery] = useState(initialQuery);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>();
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [previous]);
  async function run(action: () => Promise<void>) {
    if (busy || loadError) return;
    setBusy(true);
    setError(undefined);
    try {
      await action();
      storageWriteSucceeded();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your saved search could not be changed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor"
      aria-labelledby="saved-searches-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="saved-searches-title" className="text-2xl font-semibold">
          Saved searches
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Save a query as a custom smart collection. Results update as your
        Library changes. Use tag:, folder:, domain:, is:favorite or quoted
        phrases. Loading a search resets other Library filters. Saved searches
        stay in this space on this device, outside bookmark backups.
      </p>
      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await savedSearches.save(
              { name, query },
              editing?.id,
              editing?.updatedAt,
            );
            setEditing(undefined);
            setName('');
            setQuery('');
            setMessage('Search saved.');
          });
        }}
      >
        <fieldset
          disabled={busy || !!loadError}
          className="flex flex-col gap-4"
        >
          <label className="field">
            Search name
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            Search query
            <textarea
              required
              rows={3}
              maxLength={1000}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='domain:example.com tag:"Read later"'
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editing ? 'Save changes' : 'Save search'}
            </Button>
            {editing && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setEditing(undefined);
                  setName('');
                  setQuery(initialQuery);
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <ul aria-label="Saved searches" className="mt-6 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-lg border border-border p-3"
          >
            <p className="break-words font-medium">{item.name}</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {item.query}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => onApply(item.query)}
                aria-label={`Load ${item.name}`}
              >
                Load
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(item);
                  setName(item.name);
                  setQuery(item.query);
                  dialog.current?.querySelector('input')?.focus();
                }}
                aria-label={`Edit saved search ${item.name}`}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete saved search “${item.name}”? Your bookmarks stay unchanged.`,
                    )
                  )
                    void run(async () => {
                      await savedSearches.remove(item.id, item.updatedAt);
                      if (editing?.id === item.id) {
                        setEditing(undefined);
                        setName('');
                        setQuery('');
                      }
                      setMessage('Saved search deleted.');
                    });
                }}
                aria-label={`Delete saved search ${item.name}`}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!items.length && (
        <p className="mt-5 text-sm text-muted-foreground">
          No saved searches yet.
        </p>
      )}
      {(error || loadError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </dialog>
  );
}
