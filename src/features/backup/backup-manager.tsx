import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MAX_BACKUP_BYTES,
  parseBackup,
  personalBackup,
  type Backup,
} from '@/database/backup';

export function BackupManager({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [backup, setBackup] = useState<Backup>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The backup could not be processed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
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
      <p className="mt-3 text-sm text-muted-foreground">
        Download your Personal bookmarks, folders and tags as an Oasis JSON
        file.
      </p>
      <Button
        className="mt-5"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const data = await personalBackup.export();
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
              }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `oasis-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage('Backup downloaded. Keep the file somewhere safe.');
          })
        }
      >
        Download backup
      </Button>
      <hr className="my-6 border-border" />
      <label className="field">
        Choose a backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setBackup(undefined);
            if (!file) return;
            void run(async () => {
              if (file.size > MAX_BACKUP_BYTES)
                throw new Error('Choose a backup smaller than 10 MB.');
              setBackup(parseBackup(await file.text()));
            });
          }}
        />
      </label>
      <p className="mt-3 text-sm text-muted-foreground">
        Restore adds missing items and keeps existing records unchanged. Deleted
        IDs, conflicting names or invalid relationships stop the entire restore.
        Nothing is replaced or deleted.
      </p>
      {backup && (
        <p className="mt-4 text-sm">
          Ready: {backup.bookmarks.length} bookmarks, {backup.folders.length}{' '}
          folders, {backup.tags.length} tags.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Close
        </Button>
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
          {busy ? 'Working…' : 'Restore backup'}
        </Button>
      </div>
    </dialog>
  );
}
