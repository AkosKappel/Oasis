import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { personalAppearance, type Appearance } from '@/database/appearance';

export function AppearanceSettings({
  appearance,
  onClose,
}: {
  appearance: Appearance;
  onClose: () => void;
}) {
  const previousFocus = useRef(document.activeElement);
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = previousFocus.current;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await personalAppearance.save({
        theme: String(data.get('theme')) as Appearance['theme'],
        accent: String(data.get('accent')) as Appearance['accent'],
        clock: String(data.get('clock')) as Appearance['clock'],
        showDate: data.has('showDate'),
        showFavorites: data.has('showFavorites'),
      });
      onClose();
    } catch {
      setError('Your settings could not be saved. Try again.');
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor"
      aria-labelledby="appearance-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        <h2 id="appearance-title" className="text-2xl font-semibold">
          Appearance
        </h2>
        <fieldset disabled={busy} className="flex flex-col gap-4">
          <label className="field">
            Theme
            <select name="theme" defaultValue={appearance.theme}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="field">
            Accent
            <select name="accent" defaultValue={appearance.accent}>
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
              <option value="plum">Plum</option>
            </select>
          </label>
          <label className="field">
            Clock format
            <select name="clock" defaultValue={appearance.clock}>
              <option value="system">System</option>
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showDate"
              defaultChecked={appearance.showDate}
            />{' '}
            Show date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showFavorites"
              defaultChecked={appearance.showFavorites}
            />{' '}
            Show favorites
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </form>
    </dialog>
  );
}
