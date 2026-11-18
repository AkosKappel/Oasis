import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IconPicker } from '@/components/icon-picker';
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
  const [icon, setIcon] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pendingDefault, setPendingDefault] = useState<boolean>();
  const selectRef = useRef<HTMLSelectElement>(null);
  function closeManagement() {
    if (busy) return;
    setOpen(false);
    setName('');
    setIcon('');
    setRenaming(false);
    setError(undefined);
    selectRef.current?.focus();
  }
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
      className="relative w-fit max-w-full text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="field min-w-0">
          <span className="sr-only">Space</span>
          <select
            ref={selectRef}
            aria-label="Active space"
            className="max-w-48 border-transparent bg-transparent py-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:text-foreground"
            value={spaceId}
            disabled={busy}
            onChange={(event) => {
              if (event.target.value === '__manage') {
                setOpen(!open);
                setName('');
                setRenaming(false);
              } else {
                select(event.target.value);
                setOpen(false);
              }
            }}
          >
            {list.map((space) => (
              <option key={space.id} value={space.id}>
                {space.icon ? `${space.icon} ${space.name}` : space.name}
              </option>
            ))}
            <option value="__manage">Manage spaces…</option>
          </select>
        </label>
      </div>
      {open && (
        <form
          id="space-management"
          aria-labelledby="space-management-title"
          className="glass-panel fixed right-4 top-20 z-20 flex w-80 max-w-[90vw] flex-col gap-3 rounded-lg border border-border bg-background p-3 text-left text-foreground"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeManagement();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await spaces.save(name, renaming ? spaceId : undefined, icon);
              setName('');
              setIcon('');
              setRenaming(false);
            });
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="space-management-title" className="text-sm font-semibold">
              Manage spaces
            </h2>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              disabled={busy}
              onClick={closeManagement}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
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
          <IconPicker
            label="Space icon"
            value={icon}
            onChange={setIcon}
            disabled={busy}
          />
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
                setIcon(renaming ? '' : (current?.icon ?? ''));
              }}
            >
              {renaming ? 'Cancel rename' : 'Rename current space'}
            </Button>
            {!renaming && (
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={closeManagement}
              >
                Cancel
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              // Personal is the fallback; choose another space to change it.
              disabled={
                busy ||
                (spaceId === 'default' &&
                  !list.some((space) => space.opensByDefault))
              }
              checked={
                pendingDefault ??
                (spaceId === 'default'
                  ? !list.some((space) => space.opensByDefault)
                  : !!current?.opensByDefault)
              }
              onChange={(event) => {
                const checked = event.target.checked;
                setPendingDefault(checked);
                void run(() =>
                  spaces.setOpensByDefault(checked ? spaceId : 'default'),
                ).finally(() => setPendingDefault(undefined));
              }}
            />
            Open new tabs in this space
          </label>
          {spaceId !== 'default' && (
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    `Delete “${current?.name}” and all its local data? Back up this space first, including bookmarks, albums, quotes, notes, tasks and settings. This cannot be undone.`,
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
