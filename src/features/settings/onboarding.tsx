import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Appearance } from '@/database/appearance';
import { reportStorageError } from '@/database/storage-health';
export function Onboarding({
  appearance,
  onFinish,
}: {
  appearance: Appearance;
  onFinish: (
    value: Appearance | undefined,
    importBookmarks: boolean,
  ) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [clock, setClock] = useState(appearance.clock),
    [theme, setTheme] = useState(appearance.theme),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function finish(skip = false, importBookmarks = false) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onFinish(
        skip ? undefined : { ...appearance, clock, theme },
        importBookmarks,
      );
    } catch (cause) {
      reportStorageError(cause);
      setError('Setup could not be saved. Try again.');
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="editor"
      aria-labelledby="welcome-title"
      onCancel={(event) => {
        event.preventDefault();
        void finish(true);
      }}
    >
      <h1 id="welcome-title" className="text-2xl font-semibold">
        Welcome to Oasis
      </h1>
      <p className="my-4 text-sm text-muted-foreground">
        A quiet new tab, with your bookmarks and preferences kept in this
        browser. Choose a few basics now or change them later in Settings.
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void finish();
        }}
      >
        <fieldset disabled={busy} className="flex flex-col gap-4">
          <label className="field">
            Clock format
            <select
              value={clock}
              onChange={(event) =>
                setClock(event.target.value as Appearance['clock'])
              }
            >
              <option value="system">System</option>
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </label>
          <label className="field">
            Theme
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as Appearance['theme'])
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => void finish(false, true)}
          >
            Import bookmarks or a backup
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void finish(true)}
            >
              Skip setup
            </Button>
            <Button>Start using Oasis</Button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </dialog>
  );
}
