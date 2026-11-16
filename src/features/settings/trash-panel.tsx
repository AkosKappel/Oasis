import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { Button } from '@/components/ui/button';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import type { TrashItem } from '@/database/trash';
export function TrashPanel() {
  const { trash } = useSpaceRepositories();
  const [items, setItems] = useState<TrashItem[]>(),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(50);
  useEffect(() => {
    const sub = liveQuery(() => trash.list()).subscribe({
      next: setItems,
      error: (cause) => {
        reportStorageError(cause);
        setError('Trash could not be loaded. Try reopening Settings.');
      },
    });
    return () => sub.unsubscribe();
  }, [trash]);
  return (
    <section
      aria-label="Trash"
      aria-busy={busy}
      className="mt-8 border-t border-border pt-6"
    >
      <h2 className="text-xl font-semibold">Trash</h2>
      <p className="my-3 text-sm text-muted-foreground">
        Restore removed bookmarks, widgets, notes and tasks in this space.
        Restore a task list before its individual tasks. Trash stays in this
        browser and is excluded from backups.
      </p>
      {items?.length === 0 && <p className="text-sm">Trash is empty.</p>}
      <ul className="flex flex-col gap-3">
        {items?.slice(0, limit).map((item) => (
          <li
            key={item.kind + item.id}
            className="flex items-center justify-between gap-3 rounded border border-border p-3"
          >
            <span className="min-w-0 break-words text-sm">
              {item.label}
              <span className="block text-xs text-muted-foreground">
                {item.kind} · {new Date(item.deletedAt).toLocaleDateString()}
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              aria-label={`Restore ${item.label}`}
              onClick={() => {
                setBusy(true);
                setError(undefined);
                void trash
                  .restore([item])
                  .catch((cause) => {
                    reportStorageError(cause);
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : 'This item could not be restored.',
                    );
                  })
                  .finally(() => setBusy(false));
              }}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
      {items && items.length > limit && (
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setLimit(limit + 50)}
        >
          Show more removed items
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
