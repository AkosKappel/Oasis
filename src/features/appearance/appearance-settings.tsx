import { SEARCH_ENGINES, type SearchEngine } from '@/lib/search-engines';
import { reportStorageError } from '@/database/storage-health';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Appearance } from '@/database/appearance';
import { normalizeHex } from '@/lib/colors';
import { appearanceColors } from './apply-appearance';

export function AppearanceSettings({
  appearance,
  onClose,
  onPreview,
  onSave,
}: {
  appearance: Appearance;
  onClose: () => void;
  onPreview: (appearance: Appearance) => void;
  onSave: (appearance: Appearance) => Promise<void>;
}) {
  const previousFocus = useRef(document.activeElement);
  const dialog = useRef<HTMLDialogElement>(null);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [draft, setDraft] = useState(appearance);
  const [primaryInput, setPrimaryInput] = useState<string>();
  const [secondaryInput, setSecondaryInput] = useState<string>();
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
  const dark = draft.theme === 'system' ? systemDark : draft.theme === 'dark';
  const colors = appearanceColors(draft, dark);
  function update(patch: Partial<Appearance>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onPreview(next);
    setError(undefined);
  }
  function setColor(kind: 'primary' | 'secondary', value: string) {
    const setter = kind === 'primary' ? setPrimaryInput : setSecondaryInput;
    setter(value);
    const normalized = normalizeHex(value);
    if (normalized || !value.trim())
      update({
        [kind === 'primary' ? 'primaryColor' : 'secondaryColor']: normalized,
      });
  }
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      [primaryInput, secondaryInput].some(
        (value) => value !== undefined && value.trim() && !normalizeHex(value),
      )
    ) {
      setError('Enter colors as hex values, such as #286443.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onSave(draft);
      onClose();
    } catch (cause) {
      reportStorageError(cause);
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
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
          <label className="field">
            Theme
            <select
              name="theme"
              value={draft.theme}
              onChange={(event) =>
                update({ theme: event.target.value as Appearance['theme'] })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="field">
            Accent
            <select
              name="accent"
              value={draft.accent}
              onChange={(event) => {
                setPrimaryInput(undefined);
                setSecondaryInput(undefined);
                update({
                  accent: event.target.value as Appearance['accent'],
                  primaryColor: undefined,
                  secondaryColor: undefined,
                });
              }}
            >
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
              <option value="plum">Plum</option>
            </select>
          </label>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {(['primary', 'secondary'] as const).map((kind) => {
              const label = kind === 'primary' ? 'Primary' : 'Secondary';
              const value = kind === 'primary' ? primaryInput : secondaryInput;
              const color = colors[kind];
              const invalid =
                value !== undefined && !!value.trim() && !normalizeHex(value);
              return (
                <fieldset key={kind} className="min-w-0">
                  <legend className="mb-2 text-sm font-medium">
                    {label} color
                  </legend>
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${label} color picker`}
                      value={color}
                      onChange={(event) => setColor(kind, event.target.value)}
                      className="h-10 w-12 shrink-0 cursor-pointer rounded border border-border bg-surface p-1"
                    />
                    <label className="field min-w-0 flex-1">
                      <span className="sr-only">{label} hex</span>
                      <input
                        type="text"
                        value={value ?? color}
                        onChange={(event) => setColor(kind, event.target.value)}
                        maxLength={7}
                        spellCheck={false}
                        autoComplete="off"
                        aria-invalid={invalid}
                        aria-describedby="color-help"
                      />
                    </label>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <p id="color-help" className="text-xs text-muted-foreground">
            Primary colors buttons and focus indicators. Secondary colors
            highlights. Text and focus colors adjust automatically for
            readability.
          </p>
          <div
            role="group"
            aria-label="Color preview"
            className="flex flex-wrap gap-2"
          >
            <span className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
              Primary preview
            </span>
            <span className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              Secondary preview
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPrimaryInput(undefined);
              setSecondaryInput(undefined);
              update({ primaryColor: undefined, secondaryColor: undefined });
            }}
          >
            Reset colors
          </Button>
          <label className="field">
            Clock format
            <select
              name="clock"
              value={draft.clock}
              onChange={(event) =>
                update({ clock: event.target.value as Appearance['clock'] })
              }
            >
              <option value="system">System</option>
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showDailyFocus ?? false}
              onChange={(event) =>
                update({ showDailyFocus: event.target.checked })
              }
            />
            Show daily focus
          </label>
          <label className="field">
            Home search
            <select
              value={draft.searchEngine ?? 'bookmarks'}
              onChange={(event) =>
                update({ searchEngine: event.target.value as SearchEngine })
              }
              aria-describedby="home-search-help"
            >
              {SEARCH_ENGINES.map((engine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
          </label>
          <p id="home-search-help" className="text-xs text-muted-foreground">
            Web searches open the selected provider only when submitted. No
            suggestions are requested. Ctrl/Cmd+K keeps bookmark search
            available.
          </p>
          <label className="field">
            Links side
            <select
              value={draft.linksSide}
              onChange={(event) =>
                update({
                  linksSide: event.target.value as Appearance['linksSide'],
                })
              }
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.linksPinned}
              onChange={(event) =>
                update({ linksPinned: event.target.checked })
              }
            />
            Keep Links open on desktop
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showDate"
              checked={draft.showDate}
              onChange={(event) => update({ showDate: event.target.checked })}
            />
            Show date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showFavorites"
              checked={draft.showFavorites}
              onChange={(event) =>
                update({ showFavorites: event.target.checked })
              }
            />
            Show shortcut row
          </label>
          {(['showRecentBookmarks', 'showFrequentBookmarks'] as const).map(
            (field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft[field] ?? false}
                  onChange={(event) =>
                    update({ [field]: event.target.checked })
                  }
                />
                {field === 'showRecentBookmarks'
                  ? 'Show recently added bookmarks'
                  : 'Show frequently opened bookmarks'}
              </label>
            ),
          )}
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
