import { useEffect, useState } from 'react';
import { BookmarkLibrary } from '@/features/bookmarks/bookmark-library';
import { CommandPalette } from '@/features/search/command-palette';
import { useAppearance } from '@/features/appearance/use-appearance';
import { AppearanceSettings } from '@/features/appearance/appearance-settings';
import { QuoteManager } from '@/features/quotes/quote-manager';
import { AlbumManager } from '@/features/albums/album-manager';
import { Home } from '@/features/home/home';

export function App() {
  const { appearance, error: appearanceError } = useAppearance();
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);
  const [search, setSearch] = useState<{ query: string }>();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('home-links')?.hidePopover();
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
      {route.split('?')[0] === '#library' ? (
        <BookmarkLibrary
          key={route}
          initialQuery={new URLSearchParams(route.split('?')[1]).get('q') ?? ''}
        />
      ) : (
        <Home
          onQuotes={() => setQuotesOpen(true)}
          onAlbums={() => setAlbumsOpen(true)}
          appearance={appearance}
          onAppearance={() => setSettingsOpen(true)}
          onSearch={(query) => setSearch({ query })}
        />
      )}
      {quotesOpen && <QuoteManager onClose={() => setQuotesOpen(false)} />}
      {albumsOpen && <AlbumManager onClose={() => setAlbumsOpen(false)} />}
      {settingsOpen && (
        <AppearanceSettings
          appearance={appearance}
          onClose={() => setSettingsOpen(false)}
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
