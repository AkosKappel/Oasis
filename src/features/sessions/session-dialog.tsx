import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import { useSpace } from '@/features/spaces/space-context';
import { createSessionRepository } from '@/database/sessions';
import { reportStorageError } from '@/database/storage-health';
import { folderOptions } from '@/features/organization/folder-tree';
import type { Bookmark, Folder } from '@/types/entities';
import { folderSession, MAX_OPEN_TABS } from './session-tabs';
import { openSession, readWindowTabs } from './session-service';

export function SessionDialog({
  bookmarks,
  folders,
  onClose,
}: {
  bookmarks: Bookmark[];
  folders: Folder[];
  onClose: () => void;
}) {
  const { spaceId } = useSpace();
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement),
    lock = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  const [mode, setMode] = useState<'save' | 'open'>('save');
  const [preview, setPreview] =
    useState<Awaited<ReturnType<typeof readWindowTabs>>>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState('new');
  const [name, setName] = useState(
    () => `Session ${new Date().toLocaleDateString()}`,
  );
  const [folderId, setFolderId] = useState('');
  const [nested, setNested] = useState(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      controller.current?.abort();
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  const existing = new Set(bookmarks.map((row) => row.url));
  const chosen =
    preview?.rows.filter(
      (row) => selected.has(row.url) && !existing.has(row.url),
    ) ?? [];
  let opening: { title: string; url: string }[] = [],
    openingError = '';
  try {
    opening = folderSession(bookmarks, folders, folderId, nested);
  } catch (cause) {
    openingError =
      cause instanceof Error ? cause.message : 'This folder is too large.';
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'This action could not be completed. Try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor !max-w-2xl"
      aria-labelledby="session-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          controller.current?.abort();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="session-title" className="text-2xl font-semibold">
          Sessions and tabs
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <div className="my-4 flex gap-2">
        <Button
          variant={mode === 'save' ? 'default' : 'outline'}
          disabled={busy}
          onClick={() => {
            setMode('save');
            setMessage('');
            setError('');
          }}
        >
          Save window
        </Button>
        <Button
          variant={mode === 'open' ? 'default' : 'outline'}
          disabled={busy}
          onClick={() => {
            setMode('open');
            setMessage('');
            setError('');
          }}
        >
          Open folder
        </Button>
      </div>
      {mode === 'save' ? (
        <>
          <p className="text-sm text-muted-foreground">
            Read this window’s tab titles and URLs, then choose what to save.
            Private tabs and browser pages are skipped. Existing links anywhere
            in this space are skipped too. Tabs stay open.
          </p>
          <div className="my-4 flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const value = await readWindowTabs();
                  setPreview(value);
                  setSelected(new Set(value.rows.map((row) => row.url)));
                })
              }
            >
              Read window tabs
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    !(await browser.permissions.remove({
                      permissions: ['tabs'],
                    }))
                  )
                    throw new Error(
                      'Tab access could not be removed. Try the browser extension settings.',
                    );
                  setPreview(undefined);
                  setSelected(new Set());
                  setMessage(
                    'Tab-reading access removed. Saved bookmarks are kept.',
                  );
                })
              }
            >
              Remove tab access
            </Button>
          </div>
          {preview && (
            <>
              <p className="text-sm">
                {chosen.length} selected. {preview.skipped} unsupported/private
                tabs, {preview.duplicates} repeated URLs and{' '}
                {preview.rows.filter((row) => existing.has(row.url)).length}{' '}
                already saved links skipped.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is a snapshot. Changes to browser tabs after reading are
                not included.
              </p>
              <ul
                aria-label="Window tab preview"
                className="my-4 max-h-64 space-y-2 overflow-auto"
              >
                {preview.rows.map((row) => (
                  <li key={row.url}>
                    <label className="flex items-start gap-2 rounded border border-border p-2">
                      <input
                        type="checkbox"
                        aria-label={`Save ${row.title}`}
                        disabled={busy || existing.has(row.url)}
                        checked={
                          !existing.has(row.url) && selected.has(row.url)
                        }
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(row.url);
                          else next.delete(row.url);
                          setSelected(next);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm">
                          {row.title}
                          {existing.has(row.url) ? ' · Already saved' : ''}
                        </span>
                        <span className="block break-all text-xs text-muted-foreground">
                          {row.url}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <label className="field">
                Save tabs to
                <select
                  disabled={busy}
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                >
                  <option value="new">New folder</option>
                  {folderOptions(folders).map((folder) => (
                    <option key={folder.id} value={`folder:${folder.id}`}>
                      {folder.path}
                    </option>
                  ))}
                </select>
              </label>
              {destination === 'new' && (
                <label className="field mt-3">
                  Session folder name
                  <input
                    value={name}
                    maxLength={80}
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
              )}
              <Button
                className="mt-4"
                disabled={busy || !chosen.length}
                onClick={() =>
                  void run(async () => {
                    const result = await createSessionRepository(spaceId).save(
                      chosen,
                      destination === 'new'
                        ? { name }
                        : { folderId: destination.slice(7) },
                    );
                    setMessage(
                      `Saved ${result.saved} links. Skipped ${result.skipped} links saved since the preview.`,
                    );
                  })
                }
              >
                Save selected tabs
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Open unique links in background tabs. No tab-reading access is
            needed. Large folders require confirmation; split folders larger
            than 50 links before opening.
          </p>
          <label className="field">
            Folder to open
            <select
              value={folderId}
              disabled={busy}
              onChange={(event) => setFolderId(event.target.value)}
            >
              <option value="">Choose a folder</option>
              {folderOptions(folders).map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.path}
                </option>
              ))}
            </select>
          </label>
          <label className="my-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={nested}
              disabled={busy}
              onChange={(event) => setNested(event.target.checked)}
            />
            Include subfolders
          </label>
          <p className="text-sm">
            {openingError || `${opening.length} unique links to open.`}
          </p>
          <Button
            className="mt-4"
            disabled={busy || !opening.length || opening.length > MAX_OPEN_TABS}
            onClick={() => {
              if (
                opening.length > 10 &&
                !confirm(`Open ${opening.length} tabs?`)
              )
                return;
              void run(async () => {
                const cancel = new AbortController();
                controller.current = cancel;
                const count = await openSession(
                  opening,
                  cancel.signal,
                  (value) => setMessage(`Opened ${value} tabs…`),
                );
                setMessage(
                  `Opened ${count} tabs.${cancel.signal.aborted ? ' Opening stopped.' : ''}`,
                );
              });
            }}
          >
            Open folder links
          </Button>
          {busy && (
            <Button
              variant="outline"
              className="ml-2"
              onClick={() => controller.current?.abort()}
            >
              Stop opening
            </Button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 break-words text-sm text-danger">
          {error}
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
