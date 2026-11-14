import { WidgetManager } from '@/features/widgets/widget-manager';
import { StorageRecovery } from '@/features/storage/storage-recovery';
import type { Appearance } from '@/database/appearance';
import { useEffect, useState } from 'react';
import { BookmarkLibrary } from '@/features/bookmarks/bookmark-library';
import { CommandPalette } from '@/features/search/command-palette';
import { useAppearance } from '@/features/appearance/use-appearance';
import { AppearanceSettings } from '@/features/appearance/appearance-settings';
import { QuoteManager } from '@/features/quotes/quote-manager';
import { AlbumManager } from '@/features/albums/album-manager';
import { Home } from '@/features/home/home';

export function App() {
  const [preview, setPreview] = useState<Appearance>();
  const {
    appearance,
    error: appearanceError,
    saveAppearance,
  } = useAppearance(preview);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);
  const [search, setSearch] = useState<{ query: string }>();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const links = document.getElementById('home-links');
        if (links?.hasAttribute('popover')) links.hidePopover();
        if (!document.querySelector('dialog[open]')) setSearch({ query: '' });
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    const navigate = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  return (
    <>
      <StorageRecovery onManageImages={() => setAlbumsOpen(true)} />
      {route.split('?')[0] === '#library' ? (
        <BookmarkLibrary
          key={route}
          initialQuery={new URLSearchParams(route.split('?')[1]).get('q') ?? ''}
        />
      ) : (
        <Home
          onPinLinks={(pinned) =>
            saveAppearance({ ...appearance, linksPinned: pinned })
          }
          onWidgets={() => setWidgetsOpen(true)}
          onQuotes={() => setQuotesOpen(true)}
          onAlbums={() => setAlbumsOpen(true)}
          appearance={preview ?? appearance}
          onAppearance={() => setSettingsOpen(true)}
          onSearch={(query) => setSearch({ query })}
        />
      )}
      {widgetsOpen && <WidgetManager onClose={() => setWidgetsOpen(false)} />}
      {quotesOpen && <QuoteManager onClose={() => setQuotesOpen(false)} />}
      {albumsOpen && <AlbumManager onClose={() => setAlbumsOpen(false)} />}
      {settingsOpen && (
        <AppearanceSettings
          appearance={appearance}
          onPreview={setPreview}
          onSave={saveAppearance}
          onClose={() => {
            setSettingsOpen(false);
            setPreview(undefined);
          }}
        />
      )}
      {appearanceError && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 rounded bg-background p-3 text-sm text-danger"
        >
          {appearanceError}
        </p>
      )}
      {search && (
        <CommandPalette
          initialQuery={search.query}
          onClose={() => setSearch(undefined)}
        />
      )}
    </>
  );
}
