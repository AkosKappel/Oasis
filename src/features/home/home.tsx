import { useEffect, useState } from 'react';
import { ArrowUpRight, Library, Search } from 'lucide-react';
import { useLibrary } from '@/features/bookmarks/use-library';

export function Home({ onSearch }: { onSearch: (query: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  const { library, error } = useLibrary();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const favorites = library?.bookmarks
    .filter((bookmark) => bookmark.isFavorite)
    .slice(0, 6);

  return (
    <main className="home min-h-dvh px-6 py-6 sm:px-10 sm:py-8">
      <nav
        aria-label="Main navigation"
        className="flex items-center justify-between text-sm"
      >
        <span className="font-medium tracking-widest text-muted-foreground">
          oasis
        </span>
        <a
          href="#library"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
        >
          <Library className="size-4" aria-hidden="true" /> Library
        </a>
      </nav>
      <section
        aria-label="Home"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center pb-20 text-center"
      >
        <h1 className="sr-only">Oasis home</h1>
        <time
          dateTime={now.toISOString()}
          className="text-[clamp(5rem,18vw,9rem)] leading-none font-extralight tracking-[-0.06em] tabular-nums"
        >
          {now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
        <p className="mt-5 text-sm text-muted-foreground sm:text-base">
          {now.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <form
          action="#library"
          onSubmit={(event) => {
            event.preventDefault();
            const query = String(
              new FormData(event.currentTarget).get('query') ?? '',
            );
            onSearch(query);
          }}
          className="mt-10 w-full max-w-sm"
        >
          <label className="flex items-center gap-3 rounded-full border border-border/60 bg-white/40 px-5 py-3 focus-within:border-primary">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Search bookmarks</span>
            <input
              type="search"
              name="query"
              placeholder="Find a bookmark"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
            />
          </label>
        </form>
        {!!favorites?.length && (
          <nav
            aria-label="Favorite bookmarks"
            className="mt-8 flex max-w-full flex-wrap justify-center gap-x-6 gap-y-3"
          >
            {favorites.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                className="flex max-w-40 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">{bookmark.title}</span>
                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </nav>
        )}
        {error && (
          <p role="alert" className="mt-6 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
