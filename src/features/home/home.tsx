import { defaultDashboardItems } from '@/database/dashboard-layout';
import { useDashboardLayout } from './use-dashboard-layout';
import { BookmarkSections } from './bookmark-sections';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import { SpaceSwitcher } from '@/features/spaces/space-switcher';
import { searchEngine, webSearchUrl } from '@/lib/search-engines';
import { WeatherWidget } from '@/features/weather/weather-widget';
import { useFocusSession } from '@/features/focus/use-focus-session';
import { FocusTimer } from '@/features/focus/focus-mode';
import { focusRemaining } from '@/database/focus-session';
import { HomeWidgets } from '@/features/widgets/home-widgets';
import { DailyFocus } from '@/features/focus/daily-focus';
import { localDay } from '@/database/daily-focus';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Library, Search, SlidersHorizontal } from 'lucide-react';
import { LinksMenu } from '@/features/links/links-menu';
import { preferredDailyItem } from '@/lib/preferred-daily-item';
import { useContentFeedback } from '@/features/content/use-content-feedback';
import { ContentRating } from '@/features/content/content-rating';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import type {
  ContentKind,
  ContentRating as Rating,
} from '@/database/content-feedback';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import type { Appearance } from '@/database/appearance';
import { useQuotes } from '@/features/quotes/use-quotes';
import { useAlbums } from '@/features/albums/use-albums';
import { useLibrary } from '@/features/bookmarks/use-library';

export function Home({
  onLayout,
  onSearch,
  appearance,
  onAppearance,
  onAlbums,
  onQuotes,
  onWidgets,
  onFocus,
  onPinLinks,
}: {
  onLayout: () => void;
  onSearch: (query: string) => void;
  appearance: Appearance;
  onAppearance: () => void;
  onAlbums: () => void;
  onQuotes: () => void;
  onWidgets: () => void;
  onFocus: () => void;
  onPinLinks: (pinned: boolean) => Promise<void>;
}) {
  const { layout, error: layoutError } = useDashboardLayout();
  const { contentFeedback } = useSpaceRepositories();
  const { feedback: storedFeedback, error: feedbackError } =
    useContentFeedback();
  const feedback = storedFeedback ?? [];
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string>();
  const [ratingError, setRatingError] = useState<string>();
  async function rate(kind: ContentKind, id: string, value: Rating | null) {
    if (ratingBusy) return;
    setRatingBusy(true);
    setRatingError(undefined);
    try {
      await contentFeedback.rate(kind, id, value);
      storageWriteSucceeded();
      setRatingMessage(
        value === 'like'
          ? 'Liked. This item and related content get more weight in daily rotation.'
          : value === 'dislike'
            ? 'Disliked. This item is skipped during daily rotation.'
            : 'Preference cleared.',
      );
    } catch (cause) {
      reportStorageError(cause);
      setRatingError(
        cause instanceof Error
          ? cause.message
          : 'Preference could not be saved. Try again.',
      );
    } finally {
      setRatingBusy(false);
    }
  }
  const source = searchEngine(appearance.searchEngine);
  const { session, error: focusError } = useFocusSession();
  const { data: quotes } = useQuotes();
  const { data: albums } = useAlbums();
  const [now, setNow] = useState(() => new Date());
  const focusing =
    !!session &&
    session.state === 'running' &&
    focusRemaining(session, now.getTime()) > 0;
  const albumImages =
    albums?.images.filter(
      (image) =>
        albums.background?.mixAllAlbums ||
        image.albumId === albums.background?.albumId,
    ) ?? [];
  const backgroundImage = !storedFeedback
    ? undefined
    : albums?.background?.rotateDaily
      ? preferredDailyItem(
          albumImages.map((image) => ({ ...image, group: image.albumId })),
          feedback.filter((record) => record.kind === 'image'),
          albums.background.mixAllAlbums
            ? 'all-albums'
            : (albums.background.albumId ?? ''),
          now,
        )
      : albumImages.find((image) => image.id === albums?.background?.imageId);
  const dailyQuote =
    storedFeedback && quotes?.settings?.visible
      ? preferredDailyItem(
          quotes.quotes
            .filter(
              (quote) => quote.collectionId === quotes.settings?.collectionId,
            )
            .map((quote) => ({
              ...quote,
              group: quote.author.trim().toLowerCase(),
            })),
          feedback.filter((record) => record.kind === 'quote'),
          quotes.settings.collectionId ?? '',
          now,
        )
      : undefined;
  const { library, error } = useLibrary();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const favorites = library?.bookmarks
    .filter((bookmark) => bookmark.isFavorite)
    .slice(0, 6);

  const sections = {
    clock: (
      <>
        <div className="flex flex-col items-center">
          {' '}
          <time
            dateTime={now.toISOString()}
            className="text-[clamp(4rem,18vw,9rem)] leading-none font-extralight tracking-[-0.06em] tabular-nums"
          >
            {now.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              ...(appearance.clock === 'system'
                ? {}
                : { hour12: appearance.clock === '12' }),
            })}
          </time>
          {appearance.showDate && (
            <p className="mt-5 text-sm text-muted-foreground sm:text-base">
              {now.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </>
    ),
    search: (
      <>
        <form
          action="#library"
          onSubmit={(event) => {
            event.preventDefault();
            const query = String(
              new FormData(event.currentTarget).get('query') ?? '',
            );
            if (source.id === 'bookmarks') onSearch(query);
            else {
              const url = webSearchUrl(source.id, query);
              if (url) window.location.assign(url);
            }
          }}
          className="mt-10 w-full"
        >
          <label className="flex items-center gap-3 rounded-full border border-border/60 bg-surface/40 px-5 py-3 focus-within:border-ring">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">
              {source.id === 'bookmarks'
                ? 'Search bookmarks'
                : `Search ${source.name}`}
            </span>
            <input
              type="search"
              name="query"
              maxLength={2000}
              placeholder={
                source.id === 'bookmarks'
                  ? 'Find a bookmark'
                  : `Search ${source.name}`
              }
              className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
            />
          </label>
        </form>
      </>
    ),
    focus: (
      <>
        {session && <FocusTimer session={session} now={now.getTime()} />}
        {appearance.showDailyFocus && (
          <DailyFocus key={localDay(now)} day={localDay(now)} />
        )}
      </>
    ),
    favorites: (
      <>
        {appearance.showFavorites && !!favorites?.length && (
          <nav
            aria-label="Favorite bookmarks"
            className="mt-8 flex max-w-full flex-wrap justify-center gap-x-6 gap-y-3"
          >
            {favorites.map((bookmark) => (
              <TrackedBookmarkLink
                bookmarkId={bookmark.id}
                key={bookmark.id}
                href={bookmark.url}
                className="flex max-w-40 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">{bookmark.title}</span>
                <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
              </TrackedBookmarkLink>
            ))}
          </nav>
        )}
      </>
    ),
    bookmarks: (
      <>
        <BookmarkSections
          bookmarks={library?.bookmarks ?? []}
          recent={appearance.showRecentBookmarks ?? false}
          frequent={appearance.showFrequentBookmarks ?? false}
        />
      </>
    ),
    widgets: (
      <>
        <HomeWidgets now={now} clock={appearance.clock} />
      </>
    ),
    weather: (
      <>
        <WeatherWidget now={now} />
      </>
    ),
    quote: (
      <>
        {dailyQuote && (
          <figure
            aria-label="Daily quote"
            className="mt-10 w-full min-w-0 text-center"
          >
            <blockquote className="whitespace-pre-line break-words text-base leading-relaxed">
              {dailyQuote.text}
            </blockquote>
            {dailyQuote.author && (
              <figcaption className="mt-3 max-w-full break-words text-sm text-muted-foreground">
                {dailyQuote.author}
              </figcaption>
            )}
            <ContentRating
              kind="quote"
              rating={
                feedback.find(
                  (record) =>
                    record.kind === 'quote' && record.itemId === dailyQuote.id,
                )?.rating
              }
              disabled={ratingBusy || !!feedbackError}
              onRate={(value) => void rate('quote', dailyQuote.id, value)}
            />
          </figure>
        )}
      </>
    ),
  };
  return (
    <main
      className={`home min-h-dvh px-6 py-6 sm:px-10 sm:py-8 ${backgroundImage ? 'home-photo' : ''}`}
      data-links-pinned={
        !focusing && appearance.linksPinned ? appearance.linksSide : undefined
      }
      data-background-image={backgroundImage?.id}
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(rgb(0 0 0 / ${albums?.background?.dimming ?? 0.6}), rgb(0 0 0 / ${albums?.background?.dimming ?? 0.6})), url("${backgroundImage.dataUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {focusing && session ? (
        <section
          aria-label="Focus mode"
          className="mx-auto flex w-full flex-1 items-center justify-center"
        >
          <FocusTimer session={session} now={now.getTime()} />
        </section>
      ) : (
        <>
          <nav
            aria-label="Main navigation"
            className={`flex flex-wrap items-center justify-between gap-3 text-sm ${appearance.linksSide === 'right' ? 'flex-row-reverse' : ''}`}
          >
            <LinksMenu
              side={appearance.linksSide}
              pinned={appearance.linksPinned}
              onPin={onPinLinks}
              bookmarks={library?.bookmarks}
              folders={library?.folders ?? []}
              tags={library?.tags ?? []}
              error={error}
            />
            <SpaceSwitcher />
            <a
              href="#library"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              <Library className="size-4" aria-hidden="true" /> Library
            </a>
          </nav>
          <section
            aria-label="Home"
            className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 py-12 text-center"
          >
            <h1 className="sr-only">Oasis home</h1>
            {(layout?.items ?? defaultDashboardItems()).map(
              (item) =>
                item.visible && (
                  <div
                    key={item.id}
                    data-home-section={item.id}
                    className={`flex w-full flex-col items-center gap-4 empty:hidden [&>*]:!mt-0 ${item.width === 'wide' ? 'max-w-4xl' : item.id === 'search' ? 'max-w-sm' : item.id === 'quote' ? 'max-w-lg' : 'max-w-xl'}`}
                  >
                    {sections[item.id]}
                  </div>
                ),
            )}
            {ratingMessage && (
              <p role="status" className="text-sm">
                {ratingMessage}
              </p>
            )}
            {(feedbackError || ratingError) && (
              <p role="alert" className="text-sm">
                {feedbackError || ratingError}
              </p>
            )}
            {focusError && (
              <p role="alert" className="mt-4 text-sm">
                {focusError}
              </p>
            )}
            {layoutError && (
              <p role="alert" className="text-sm text-danger">
                {layoutError}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-6 text-sm text-danger">
                {error}
              </p>
            )}
          </section>
          {backgroundImage && (
            <div className="mb-4 self-center text-center">
              <span className="text-xs">{backgroundImage.name}</span>
              <ContentRating
                kind="image"
                rating={
                  feedback.find(
                    (record) =>
                      record.kind === 'image' &&
                      record.itemId === backgroundImage.id,
                  )?.rating
                }
                disabled={ratingBusy || !!feedbackError}
                onRate={(value) =>
                  void rate('image', backgroundImage.id, value)
                }
              />
            </div>
          )}
          <footer className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onLayout}
            >
              Layout
            </button>
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onFocus}
            >
              Focus mode
            </button>
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onWidgets}
            >
              Widgets
            </button>
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onQuotes}
            >
              Quotes
            </button>
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onAlbums}
            >
              Image albums
            </button>
            <button
              type="button"
              onClick={onAppearance}
              aria-label="Appearance"
              className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </button>
          </footer>
        </>
      )}
    </main>
  );
}
