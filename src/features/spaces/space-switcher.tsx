import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { spaces } from '@/database/spaces';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useSpace } from './space-context';

export function SpaceSwitcher() {
  const { spaceId, list, select } = useSpace();
  const current = list.find((space) => space.id === spaceId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run(action: () => Promise<void>) {
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
          : 'This space could not be changed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      role="group"
      aria-label="Spaces"
      className="relative mb-3 max-w-full rounded-lg border border-border bg-background p-2 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="field min-w-0">
          Space
          <select
            aria-label="Active space"
            className="max-w-48"
            value={spaceId}
            disabled={busy}
            onChange={(event) => select(event.target.value)}
          >
            {list.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls="space-management"
          onClick={() => {
            setOpen(!open);
            setName('');
            setRenaming(false);
          }}
        >
          Manage spaces
        </Button>
      </div>
      {open && (
        <form
          id="space-management"
          className="mt-3 flex max-w-sm flex-col gap-3 rounded-lg border border-border bg-background p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await spaces.save(name, renaming ? spaceId : undefined);
              setName('');
              setRenaming(false);
            });
          }}
        >
          <label className="field">
            {renaming ? 'Rename space' : 'New space name'}
            <input
              required
              maxLength={80}
              disabled={busy}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy}>
              {renaming ? 'Save space name' : 'Create space'}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => {
                setRenaming(!renaming);
                setName(renaming ? '' : (current?.name ?? ''));
              }}
            >
              {renaming ? 'Cancel rename' : 'Rename current space'}
            </Button>
          </div>
          {spaceId !== 'default' && (
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    `Delete “${current?.name}” and all its local data? Export its bookmarks, albums and quotes first. This cannot be undone.`,
                  )
                )
                  void run(async () => {
                    await spaces.remove(spaceId);
                    select('default');
                  });
              }}
            >
              Delete current space
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Switching closes open editors. Each tab remembers its own space.
            Deleting a space removes its library and settings.
          </p>
        </form>
      )}
    </div>
  );
}
