import { useEffect, useState } from 'react';
import { BookmarkLibrary } from '@/features/bookmarks/bookmark-library';
import { CommandPalette } from '@/features/search/command-palette';
import { Home } from '@/features/home/home';

export function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  const [search, setSearch] = useState<{ query: string }>();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
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
        <Home onSearch={(query) => setSearch({ query })} />
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
