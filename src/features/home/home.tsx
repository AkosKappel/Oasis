import { NoteEditor } from '@/features/widgets/note-editor';
import { TaskListDialog } from '@/features/widgets/task-list';
import type { HomeWidget } from '@/database/home-widgets';
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
import { useContentProviders } from '@/features/content/use-content-providers';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Library, Search, Settings2 } from 'lucide-react';
import { LinksMenu } from '@/features/links/links-menu';
import {
  preferredDailyItem,
  nextPreferredItem,
} from '@/lib/preferred-daily-item';
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
import { LinksDesktop } from '@/features/links/links-desktop';

export function Home({
  onSearch,
  appearance,
  onSettings,
  onFocus,
  onPinLinks,
}: {
  onSearch: (query: string) => void;
  appearance: Appearance;
  onSettings: () => void;
  onFocus: () => void;
  onPinLinks: (pinned: boolean) => Promise<void>;
}) {
  const { layout, error: layoutError } = useDashboardLayout();
  const [note, setNote] = useState<Extract<HomeWidget, { kind: 'note' }>>();
  const [taskList, setTaskList] = useState<HomeWidget>();
  const preferenceTrigger = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<HTMLElement | null>(null);
  const { contentFeedback } = useSpaceRepositories();
  const { feedback: storedFeedback, error: feedbackError } =
    useContentFeedback();
  const feedback = storedFeedback ?? [];
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string>();
  const [ratingError, setRatingError] = useState<string>();
  async function rate(kind: ContentKind, id: string, value: Rating | null) {
    if (ratingBusy) return;
    pendingFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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
  useEffect(() => {
    if (
      !ratingBusy &&
      pendingFocus.current &&
      !pendingFocus.current.isConnected
    ) {
      preferenceTrigger.current?.focus();
      pendingFocus.current = null;
    }
  }, [storedFeedback, ratingBusy]);
  const source = searchEngine(appearance.searchEngine);
  const { session, error: focusError } = useFocusSession();
  const { data: quotes } = useQuotes();
  const { data: albums } = useAlbums();
  const [today, setToday] = useState(() => localDay(new Date()));
  const providers = useContentProviders(today);
  const [loadedPicture, setLoadedPicture] = useState<string>();
  useEffect(() => {
    const url = providers.picture?.url;
    if (!url) return;
    // Show the picture only once it loads, so offline Home keeps the album image.
    const image = new Image();
    image.onload = () => setLoadedPicture(url);
    image.src = url;
    return () => {
      image.onload = null;
    };
  }, [providers.picture?.url]);
  const webPicture =
    providers.picture && loadedPicture === providers.picture.url
      ? providers.picture
      : undefined;
  const webQuote = providers.quote;
  const [nextChoices, setNextChoices] = useState<
    Partial<Record<ContentKind, { scope: string; id: string; seen: string[] }>>
  >({});
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
  const imageItems = albumImages.map((image) => ({
    ...image,
    group: image.albumId,
  }));
  const quoteItems = (quotes?.quotes ?? [])
    .filter((quote) => quote.collectionId === quotes?.settings?.collectionId)
    .map((quote) => ({ ...quote, group: quote.author.trim().toLowerCase() }));
  const defaultImage = !storedFeedback
    ? undefined
    : albums?.background?.rotateDaily
      ? preferredDailyItem(
          imageItems,
          feedback.filter((record) => record.kind === 'image'),
          albums.background.mixAllAlbums
            ? 'all-albums'
            : (albums.background.albumId ?? ''),
          now,
        )
      : albumImages.find((image) => image.id === albums?.background?.imageId);
  const defaultQuote =
    storedFeedback && quotes?.settings?.visible
      ? preferredDailyItem(
          quoteItems,
          feedback.filter((record) => record.kind === 'quote'),
          quotes.settings.collectionId ?? '',
          now,
        )
      : undefined;

  const dislikes = {
    image: new Set(
      feedback
        .filter(
          (record) => record.kind === 'image' && record.rating === 'dislike',
        )
        .map((record) => record.itemId),
    ),
    quote: new Set(
      feedback
        .filter(
          (record) => record.kind === 'quote' && record.rating === 'dislike',
        )
        .map((record) => record.itemId),
    ),
  };
  const imageScope = JSON.stringify([
    localDay(now),
    albums?.background?.albumId,
    albums?.background?.mixAllAlbums,
    albums?.background?.rotateDaily,
    albums?.background?.imageId,
    albums?.background?.updatedAt,
  ]);
  const quoteScope = JSON.stringify([
    localDay(now),
    quotes?.settings?.collectionId,
    quotes?.settings?.updatedAt,
  ]);
  function override<T extends { id: string }>(
    kind: ContentKind,
    scope: string,
    items: T[],
  ) {
    const choice = nextChoices[kind];
    return choice?.scope === scope && !dislikes[kind].has(choice.id)
      ? items.find((item) => item.id === choice.id)
      : undefined;
  }
  const backgroundImage =
    override('image', imageScope, imageItems) ?? defaultImage;
  const dailyQuote = quotes?.settings?.visible
    ? (override('quote', quoteScope, quoteItems) ?? defaultQuote)
    : undefined;
  function showNext(kind: ContentKind) {
    const scope = kind === 'image' ? imageScope : quoteScope,
      current = kind === 'image' ? backgroundImage : dailyQuote,
      items = kind === 'image' ? imageItems : quoteItems;
    if (!current) return;
    const previous = nextChoices[kind],
      seen = previous?.scope === scope ? previous.seen : [];
    const next = nextPreferredItem<{ id: string; group: string }>(
      items,
      feedback.filter((record) => record.kind === kind),
      scope,
      now,
      current.id,
      seen,
    );
    if (!next) return;
    setNextChoices((value) => ({
      ...value,
      [kind]: {
        scope,
        id: next.id,
        seen: seen.includes(next.id)
          ? [current.id, next.id]
          : [...new Set([...seen, current.id, next.id])],
      },
    }));
    const label =
      kind === 'image'
        ? imageItems.find((item) => item.id === next.id)?.name
        : quoteItems.find((item) => item.id === next.id)?.text;
    setRatingMessage(
      `Showing ${kind === 'image' ? 'image' : 'quote'}: ${label ?? 'another item'}. No preference changed.`,
    );
  }
  const hasNext = (
    kind: ContentKind,
    currentId: string,
    items: { id: string }[],
  ) =>
    items.some((item) => item.id !== currentId && !dislikes[kind].has(item.id));
  const { library, error } = useLibrary();
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = new Date();
      setNow(next);
      setToday(localDay(next));
    }, 1000);
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
        <HomeWidgets
          now={now}
          clock={appearance.clock}
          onEditNote={setNote}
          onManageTasks={setTaskList}
        />
      </>
    ),
    weather: (
      <>
        <WeatherWidget now={now} />
      </>
    ),
    desktop: library && (
      <LinksDesktop
        bookmarks={library.bookmarks}
        folders={library.folders}
        tags={library.tags}
      />
    ),
    quote: (
      <>
        {webQuote && (
          <figure
            aria-label="Quote of the day"
            className="relative mt-10 w-full min-w-0 text-center"
          >
            <blockquote className="whitespace-pre-line break-words text-base leading-relaxed">
              {webQuote.text}
            </blockquote>
            <figcaption className="mt-3 max-w-full break-words text-sm text-muted-foreground">
              {webQuote.author} ·{' '}
              <a
                href="https://zenquotes.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Quote from ZenQuotes
              </a>
            </figcaption>
          </figure>
        )}
        {!webQuote && dailyQuote && (
          <figure
            aria-label="Daily quote"
            className="content-feedback-target relative mt-10 w-full min-w-0 text-center"
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
              onNext={
                hasNext('quote', dailyQuote.id, quoteItems)
                  ? () => showNext('quote')
                  : undefined
              }
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
        {storedFeedback &&
          !webQuote &&
          quotes?.settings?.visible &&
          !dailyQuote &&
          quotes.quotes.some(
            (quote) => quote.collectionId === quotes.settings?.collectionId,
          ) && (
            <p className="text-sm">
              All quotes in this collection are disliked. Clear a choice in
              Content preferences to show quotes again.
            </p>
          )}
      </>
    ),
  };
  return (
    <main
      className={`home min-h-dvh px-6 py-6 sm:px-10 sm:py-8 ${backgroundImage || webPicture ? 'home-photo' : ''}`}
      data-links-pinned={
        !focusing && appearance.linksPinned ? appearance.linksSide : undefined
      }
      data-background-image={
        webPicture ? `wikimedia:${webPicture.day}` : backgroundImage?.id
      }
      style={
        webPicture || backgroundImage
          ? {
              backgroundImage: `linear-gradient(rgb(0 0 0 / ${albums?.background?.dimming ?? 0.6}), rgb(0 0 0 / ${albums?.background?.dimming ?? 0.6})), url(${JSON.stringify(webPicture?.url ?? backgroundImage!.dataUrl)})`,
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
              sections={{
                favorites: appearance.showLinksFavorites ?? true,
                recent: appearance.showLinksRecent ?? true,
                frequent: appearance.showLinksFrequent ?? true,
              }}
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
              <p role="status" className="sr-only">
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
          {storedFeedback &&
            albums?.background?.rotateDaily &&
            albumImages.length > 0 &&
            !backgroundImage && (
              <p className="mb-4 text-center text-sm">
                All backgrounds in this rotation are disliked. Clear a choice in
                Content preferences to show images again.
              </p>
            )}
          <footer className="content-feedback-target flex flex-wrap items-center justify-end gap-3">
            {webPicture && (
              <p className="mr-auto max-w-full min-w-0 truncate text-xs text-muted-foreground">
                <a
                  href={webPicture.filePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  title={`${webPicture.title}, ${webPicture.artist}, ${webPicture.license}`}
                >
                  Picture of the day: {webPicture.title}
                </a>{' '}
                · {webPicture.artist} ·{' '}
                {webPicture.licenseUrl ? (
                  <a
                    href={webPicture.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {webPicture.license}
                  </a>
                ) : (
                  webPicture.license
                )}{' '}
                · Wikimedia Commons
              </p>
            )}
            {!webPicture && backgroundImage && (
              <div className="mr-auto flex items-center">
                <ContentRating
                  kind="image"
                  onNext={
                    hasNext('image', backgroundImage.id, imageItems)
                      ? () => showNext('image')
                      : undefined
                  }
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

            <button
              ref={preferenceTrigger}
              aria-label="Settings"
              title="Settings"
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:text-foreground"
              onClick={onSettings}
            >
              <Settings2 className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={onFocus}
            >
              Focus mode
            </button>
          </footer>
        </>
      )}
      {note && <NoteEditor widget={note} onClose={() => setNote(undefined)} />}
      {taskList && (
        <TaskListDialog
          widget={taskList}
          onClose={() => setTaskList(undefined)}
        />
      )}
    </main>
  );
}
