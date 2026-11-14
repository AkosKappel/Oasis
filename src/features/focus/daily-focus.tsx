import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import {
  personalDailyFocus,
  type DailyFocus as FocusRecord,
} from '@/database/daily-focus';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { Button } from '@/components/ui/button';

export function DailyFocus({ day }: { day: string }) {
  const { retryVersion } = useStorageHealth();
  const [record, setRecord] = useState<FocusRecord>();
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const subscription = liveQuery(() => personalDailyFocus.get(day)).subscribe(
      {
        next: (value) => {
          setRecord(value);
          setLoaded(true);
          setError(undefined);
        },
        error: (cause) => {
          reportStorageError(cause, true);
          setError('Your focus could not be loaded. Use Retry storage.');
        },
      },
    );
    return () => subscription.unsubscribe();
  }, [day, retryVersion]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Your focus could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Daily focus" className="mt-7 w-full max-w-sm">
      <h2 className="text-sm text-muted-foreground">
        What matters most today?
      </h2>
      {!loaded ? (
        <p className="mt-2 text-sm">Loading focus…</p>
      ) : !record || editing ? (
        <form
          className="mt-3 flex flex-wrap justify-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await personalDailyFocus.save(day, draft);
              setEditing(false);
            });
          }}
        >
          <label className="w-full">
            <span className="sr-only">Today's focus</span>
            <input
              ref={input}
              required
              maxLength={160}
              disabled={busy}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="One thing worth your attention"
              className="w-full border-b border-current/40 bg-transparent py-2 text-center outline-none focus-visible:outline"
            />
          </label>
          <Button size="sm" disabled={busy}>
            Save focus
          </Button>
          {record && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          )}
        </form>
      ) : (
        <div className="mt-3 flex items-start justify-center gap-3">
          <label className="flex min-w-0 items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 shrink-0"
              aria-label="Complete today's focus"
              checked={record.completed}
              disabled={busy}
              onChange={(event) => {
                const completed = event.target.checked;
                setRecord({ ...record, completed });
                void run(async () => {
                  try {
                    await personalDailyFocus.complete(day, completed);
                  } catch (cause) {
                    setRecord(record);
                    throw cause;
                  }
                });
              }}
            />
            <span
              className={`break-words text-lg ${record.completed ? 'line-through opacity-70' : ''}`}
            >
              {record.title}
            </span>
          </label>
          <button
            type="button"
            className="shrink-0 rounded px-2 text-sm underline"
            onClick={() => {
              setDraft(record.title);
              setEditing(true);
              requestAnimationFrame(() => input.current?.focus());
            }}
          >
            Edit focus
          </button>
        </div>
      )}
      {record?.completed && !editing && (
        <p role="status" className="mt-2 text-sm">
          Done for today. Nicely done.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
