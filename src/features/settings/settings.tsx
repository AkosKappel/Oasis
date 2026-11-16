import { TrashPanel } from './trash-panel';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Appearance } from '@/database/appearance';
import { AppearanceSettings } from '@/features/appearance/appearance-settings';
import { LayoutManager } from '@/features/home/layout-manager';
import { AlbumManager } from '@/features/albums/album-manager';
import { QuoteManager } from '@/features/quotes/quote-manager';
import { WidgetManager } from '@/features/widgets/widget-manager';
import { ContentPreferences } from '@/features/content/content-preferences';
import { BackupManager } from '@/features/backup/backup-manager';
import { useLibraryPreferences } from '@/features/bookmarks/use-library-preferences';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
const pages = {
  general: 'General',
  appearance: 'Appearance',
  layout: 'Home layout',
  albums: 'Image albums',
  quotes: 'Quote collections',
  feedback: 'Content preferences',
  widgets: 'Widgets',
  privacy: 'Privacy',
  data: 'Backup and restore',
};
export type SettingsPage = keyof typeof pages;
export function Settings({
  initialPage = 'general',
  appearance,
  onPreview,
  onSave,
  onClose,
}: {
  initialPage?: SettingsPage;
  appearance: Appearance;
  onPreview: (value: Appearance | undefined) => void;
  onSave: (value: Appearance) => Promise<void>;
  onClose: () => void;
}) {
  const [page, setPage] = useState(initialPage);
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const focused = previous.current;
    const dialog = ref.current!;
    dialog.showModal();
    const observer = new MutationObserver(() =>
      setBusy(!!dialog.querySelector('[aria-busy="true"]')),
    );
    observer.observe(dialog, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    });
    return () => {
      observer.disconnect();
      if (focused instanceof HTMLElement && focused.isConnected)
        requestAnimationFrame(() => {
          if (focused.isConnected) focused.focus();
        });
    };
  }, []);
  function navigate(value: SettingsPage) {
    if (busy) return;
    onPreview(undefined);
    setPage(value);
  }
  function close() {
    if (!ref.current?.querySelector('[aria-busy="true"]')) onClose();
  }
  return (
    <dialog
      ref={ref}
      className="editor !max-w-5xl"
      aria-label={pages[page]}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Button variant="outline" disabled={busy} onClick={close}>
          Close settings
        </Button>
      </div>
      <label className="field mb-5 md:hidden">
        Settings section
        <select
          disabled={busy}
          value={page}
          onChange={(event) => navigate(event.target.value as SettingsPage)}
        >
          {Object.entries(pages).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="hidden flex-col gap-1 md:flex"
        >
          {Object.entries(pages).map(([key, label]) => (
            <Button
              key={key}
              variant={page === key ? 'default' : 'outline'}
              disabled={busy}
              aria-current={page === key ? 'page' : undefined}
              className="justify-start"
              onClick={() => navigate(key as SettingsPage)}
            >
              {label}
            </Button>
          ))}
        </nav>
        <div key={page} className="min-w-0">
          {(page === 'general' || page === 'appearance') && (
            <AppearanceSettings
              embedded
              general={page === 'general'}
              appearance={appearance}
              onPreview={onPreview}
              onSave={onSave}
              onClose={onClose}
            />
          )}
          {page === 'layout' && <LayoutManager embedded onClose={onClose} />}
          {page === 'albums' && <AlbumManager embedded onClose={onClose} />}
          {page === 'quotes' && <QuoteManager embedded onClose={onClose} />}
          {page === 'feedback' && (
            <ContentPreferences embedded onClose={onClose} />
          )}
          {page === 'widgets' && <WidgetManager embedded onClose={onClose} />}
          {page === 'privacy' && <Privacy />}
          {page === 'data' && (
            <>
              <BackupManager embedded onClose={onClose} />
              <TrashPanel />
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
function Privacy() {
  const {
    preferences,
    setPreferences,
    error: loadError,
  } = useLibraryPreferences();
  const { personalLibraryPreferences, openHistory } = useSpaceRepositories();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>();
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError('Privacy settings could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-busy={busy}>
      <h2 className="text-2xl font-semibold">Privacy</h2>
      <p className="my-4 text-sm">
        Oasis keeps your data in this browser. Web searches and enabled weather
        requests contact the provider you choose.
      </p>
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preferences.trackOpens ?? false}
            onChange={(event) => {
              const previous = preferences,
                next = { ...preferences, trackOpens: event.target.checked };
              setPreferences(next);
              void run(async () => {
                try {
                  await personalLibraryPreferences.save(next);
                } catch (cause) {
                  setPreferences(previous);
                  throw cause;
                }
              });
            }}
          />
          Count bookmark opens in Oasis
        </label>
        <p className="text-xs text-muted-foreground">
          Off by default. Counts only opens made from Oasis. Turning it off
          keeps existing counts until you clear them.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (
              confirm('Clear open counts and last-opened times in this space?')
            )
              void run(async () => {
                await openHistory.clear();
                setMessage('Open history cleared.');
              });
          }}
        >
          Clear open history
        </Button>
      </fieldset>
      {(error || loadError) && <p role="alert">{error || loadError}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
