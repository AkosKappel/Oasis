import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import {
  QUOTE_ORIGIN,
  type ContentProviders,
  type ProviderKind,
} from '@/database/content-providers';
import { reportStorageError } from '@/database/storage-health';
import { useSpaceRepositories } from '@/features/spaces/space-context';

const copy = {
  picture: {
    title: 'Picture of the day',
    label: 'Use the Wikimedia Commons picture of the day',
    detail:
      'Oasis asks Wikipedia for today’s featured picture once a day and shows it with its author and license. Wikimedia receives your IP address. No site access is needed. When the picture cannot load, your album background is shown.',
  },
  quote: {
    title: 'Quote of the day',
    label: 'Show the ZenQuotes quote of the day',
    detail:
      'Oasis asks ZenQuotes for today’s quote once a day after you allow access to zenquotes.io. ZenQuotes receives your IP address. The quote replaces your collection’s quote while it is available, with a link to ZenQuotes.',
  },
} as const;

export function ProviderSettings({ kind }: { kind: ProviderKind }) {
  const { contentProviders } = useSpaceRepositories();
  const [settings, setSettings] = useState<ContentProviders>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    const subscription = liveQuery(() => contentProviders.get()).subscribe({
      next: setSettings,
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Content settings could not be loaded. Use Retry storage.');
      },
    });
    return () => subscription.unsubscribe();
  }, [contentProviders]);
  async function change(enabled: boolean) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      // Keep the permission request inside the click, before any storage work.
      if (
        kind === 'quote' &&
        enabled &&
        !(await browser.permissions.request({ origins: [QUOTE_ORIGIN] }))
      ) {
        setError(
          'Access to zenquotes.io was not granted. The quote stays off.',
        );
        return;
      }
      await contentProviders.setEnabled(kind, enabled);
      if (kind === 'quote' && !enabled)
        await browser.permissions
          .remove({ origins: [QUOTE_ORIGIN] })
          .catch(() => false);
      setMessage(
        enabled
          ? `${copy[kind].title} is on. It appears on Home when it is available.`
          : `${copy[kind].title} is off.`,
      );
    } catch (cause) {
      reportStorageError(cause);
      setError('This setting could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const enabled = !!settings?.[kind];
  return (
    <section
      aria-labelledby={`provider-${kind}-title`}
      className="mt-8 border-t border-border pt-6"
    >
      <h3 id={`provider-${kind}-title`} className="font-semibold">
        {copy[kind].title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy[kind].detail}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant={enabled ? 'outline' : 'default'}
          disabled={busy || !settings}
          aria-pressed={enabled}
          onClick={() => void change(!enabled)}
        >
          {copy[kind].label}
        </Button>
        <span className="text-sm">{enabled ? 'On' : 'Off'}</span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
