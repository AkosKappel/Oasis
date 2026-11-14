import { useEffect, useState } from 'react';
import { BookmarkLibrary } from '@/features/bookmarks/bookmark-library';
import { Home } from '@/features/home/home';

export function App() {
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => {
    const navigate = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  return route.split('?')[0] === '#library' ? (
    <BookmarkLibrary
      key={route}
      initialQuery={new URLSearchParams(route.split('?')[1]).get('q') ?? ''}
    />
  ) : (
    <Home />
  );
}
