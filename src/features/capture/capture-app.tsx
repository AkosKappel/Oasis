import { SpaceProvider, useSpace } from '@/features/spaces/space-context';
import { SpaceSwitcher } from '@/features/spaces/space-switcher';
import { StorageRecovery } from '@/features/storage/storage-recovery';
import { useAppearance } from '@/features/appearance/use-appearance';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { BookmarkEditor } from '@/features/bookmarks/bookmark-editor';
import { useLibrary } from '@/features/bookmarks/use-library';
import { captureTab } from './capture-tab';
import type { BookmarkInput } from '@/database/bookmarks';

function CaptureContent({
  fullPage = false,
  initialTab,
  initialError,
}: {
  fullPage?: boolean;
  initialTab?: { title?: string; url?: string };
  initialError?: string;
}) {
  const { list, spaceId } = useSpace();
  useAppearance();
  const { library, error: libraryError } = useLibrary();
  const [request] = useState<{ values?: BookmarkInput; error?: string }>(() => {
    if (initialError) return { error: initialError };
    if (!initialTab) return {};
    try {
      return { values: captureTab(initialTab) };
    } catch (cause) {
      return {
        error:
          cause instanceof Error
            ? cause.message
            : 'This page could not be captured.',
      };
    }
  });
  const [initialValues, setInitialValues] = useState<BookmarkInput | undefined>(
    request.values,
  );
  const [error, setError] = useState<string | undefined>(request.error);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (initialTab || initialError) return;
    let active = true;
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (active) setInitialValues(captureTab(tabs[0]));
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'The current page could not be read. Open a website and try again.',
          );
      });
    return () => {
      active = false;
    };
  }, [initialTab, initialError]);
  async function close() {
    if (!fullPage) {
      window.close();
      return;
    }
    try {
      const tab = await browser.tabs.getCurrent();
      if (tab?.id !== undefined) await browser.tabs.remove(tab.id);
      else window.close();
    } catch {
      window.close();
    }
  }
  return (
    <main className={fullPage ? 'mx-auto w-full max-w-lg p-6' : 'p-5'}>
      <StorageRecovery />
      <SpaceSwitcher />
      {saved ? (
        <div role="status" className="py-8">
          <h1 className="text-xl font-semibold">Bookmark saved</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You can find it in{' '}
            {list.find((space) => space.id === spaceId)?.name ?? 'your'}{' '}
            library.
          </p>
        </div>
      ) : error || libraryError ? (
        <p role="alert" className="text-sm text-danger">
          {error || libraryError}
        </p>
      ) : initialValues && library ? (
        <BookmarkEditor
          embedded
          initialValues={initialValues}
          folders={library.folders}
          tags={library.tags}
          onClose={() => void close()}
          onSaved={() => setSaved(true)}
        />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Loading current page…
        </p>
      )}
      {fullPage && saved && (
        <button
          type="button"
          className="mt-4 mr-5 rounded text-sm text-primary-content underline"
          onClick={() => void close()}
        >
          Close
        </button>
      )}
      <a
        className="mt-5 inline-block rounded text-sm text-primary-content underline underline-offset-4"
        href={`${browser.runtime.getURL('/newtab.html')}#library`}
        target="_blank"
        rel="noreferrer"
      >
        Open Library
      </a>
    </main>
  );
}

export function CaptureApp(props: Parameters<typeof CaptureContent>[0]) {
  return (
    <SpaceProvider>
      <CaptureContent {...props} />
    </SpaceProvider>
  );
}
