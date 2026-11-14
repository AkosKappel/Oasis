import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MAX_BACKUP_BYTES,
  parseBackup,
  personalBackup,
  type Backup,
} from '@/database/backup';
import {
  MAX_HTML_BYTES,
  personalBookmarkHtml,
  type HtmlImport,
} from '@/database/bookmark-html';
import { parseBookmarkHtml } from '@/features/transfer/parse-bookmark-html';

function downloadFile(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BackupManager({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement);
  const [backup, setBackup] = useState<Backup>();
  const [html, setHtml] = useState<HtmlImport>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    const previous = previousFocus.current;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The file could not be processed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const date = () => new Date().toISOString().slice(0, 10);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      aria-labelledby="backup-title"
      className="editor"
    >
      <h2 id="backup-title" className="text-2xl font-semibold">
        Backup and restore
      </h2>
      <section
        aria-label="Oasis JSON backup"
        className="mt-5 flex flex-col gap-4"
      >
        <h3 className="text-lg font-medium">Oasis backup</h3>
        <p className="text-sm text-muted-foreground">
          Keep bookmarks, folders, tags, favorites and notes in an Oasis JSON
          file.
        </p>
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              downloadFile(
                JSON.stringify(await personalBackup.export(), null, 2),
                'application/json',
                `oasis-backup-${date()}.json`,
              );
              setMessage('Backup downloaded. Keep the file somewhere safe.');
            })
          }
        >
          Download backup
        </Button>
        <label className="field">
          Choose a backup
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setBackup(undefined);
              setHtml(undefined);
              if (file)
                void run(async () => {
                  if (file.size > MAX_BACKUP_BYTES)
                    throw new Error('Choose a backup smaller than 10 MB.');
                  setBackup(parseBackup(await file.text()));
                });
            }}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Restore adds missing items and keeps existing records unchanged.
          Deleted IDs, conflicting names or invalid relationships stop the
          entire restore.
        </p>
        {backup && (
          <p className="text-sm">
            Ready: {backup.bookmarks.length} bookmarks, {backup.folders.length}{' '}
            folders, {backup.tags.length} tags.
          </p>
        )}
        <Button
          disabled={busy || !backup}
          onClick={() =>
            void run(async () => {
              if (!backup) return;
              const result = await personalBackup.restore(backup);
              setBackup(undefined);
              setMessage(
                `Restore complete. Added ${result.added} items; kept ${result.kept} existing items.`,
              );
            })
          }
        >
          Restore backup
        </Button>
      </section>
      <hr className="my-6 border-border" />
      <section
        aria-label="Browser bookmark HTML"
        className="flex flex-col gap-4"
      >
        <h3 className="text-lg font-medium">Browser bookmarks</h3>
        <p className="text-sm text-muted-foreground">
          Import or export bookmark HTML with folders, titles, URLs and
          descriptions. Use JSON to keep tags, favorites and notes.
        </p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              downloadFile(
                await personalBookmarkHtml.export(),
                'text/html;charset=utf-8',
                `oasis-bookmarks-${date()}.html`,
              );
              setMessage('Bookmark HTML downloaded.');
            })
          }
        >
          Download bookmark HTML
        </Button>
        <label className="field">
          Choose bookmark HTML
          <input
            type="file"
            accept=".html,.htm,text/html"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setHtml(undefined);
              setBackup(undefined);
              if (file)
                void run(async () => {
                  if (file.size > MAX_HTML_BYTES)
                    throw new Error(
                      'Choose a bookmark HTML file smaller than 10 MB.',
                    );
                  setHtml(parseBookmarkHtml(await file.text()));
                });
            }}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Matching folder paths are merged. Exact URLs already in the same
          folder are skipped. Import up to 10,000 items and 32 folder levels per
          file.
        </p>
        {html && (
          <p className="text-sm">
            Ready: {html.bookmarks.length} bookmarks, {html.folders.length}{' '}
            folders. Skipped {html.skipped} unsafe or invalid links. Duplicates
            are checked when importing.
          </p>
        )}
        <Button
          disabled={busy || !html}
          onClick={() =>
            void run(async () => {
              if (!html) return;
              const result = await personalBookmarkHtml.import(html);
              setHtml(undefined);
              setMessage(
                `Import complete. Added ${result.bookmarks} bookmarks and ${result.folders} folders. Skipped ${result.duplicates} duplicates and ${result.skipped} invalid links.`,
              );
            })
          }
        >
          Import bookmarks
        </Button>
      </section>
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
      <div className="mt-6 flex justify-end">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
