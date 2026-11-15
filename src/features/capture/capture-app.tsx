import { readPageDetails, type PageDetails } from './read-page-details';
import { Button } from '@/components/ui/button';
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
  const [sourceTabId, setSourceTabId] = useState<number>();
  const [scriptAllowed, setScriptAllowed] = useState(false);
  useEffect(() => {
    void browser.permissions
      .contains({ permissions: ['scripting'] })
      .then(setScriptAllowed)
      .catch(() => {});
  }, []);
  async function readDetails(url: string): Promise<PageDetails> {
    if (
      sourceTabId === undefined ||
      !initialValues ||
      url !== initialValues.url
    )
      throw new Error(
        'Reopen the toolbar on the page you want to save before reading details.',
      );
    // Keep the optional permission request in the button gesture, before any tab reads.
    if (!(await browser.permissions.request({ permissions: ['scripting'] })))
      throw new Error(
        'Page details stay off. You can save the bookmark without them.',
      );
    setScriptAllowed(true);
    try {
      const tab = await browser.tabs.get(sourceTabId);
      if (tab.url !== initialValues.url) throw new Error();
      const results = await browser.scripting.executeScript({
        target: { tabId: sourceTabId },
        func: readPageDetails,
        world: 'ISOLATED',
      });
      const details = results[0]?.result;
      if (!details || details.url !== initialValues.url) throw new Error();
      return details;
    } catch {
      throw new Error(
        'Page details could not be read. Reopen the toolbar on the page and try again.',
      );
    }
  }
  async function revokeDetails() {
    try {
      if (await browser.permissions.remove({ permissions: ['scripting'] }))
        setScriptAllowed(false);
    } catch {
      setError(
        'Page-detail access could not be removed. Use browser extension settings.',
      );
    }
  }
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (initialTab || initialError) return;
    let active = true;
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (active) {
          setInitialValues(captureTab(tabs[0]));
          setSourceTabId(tabs[0]?.id);
        }
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
          onReadDetails={
            !fullPage && sourceTabId !== undefined ? readDetails : undefined
          }
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
      {scriptAllowed && (
        <div className="mt-4">
          <Button variant="outline" onClick={() => void revokeDetails()}>
            Remove page-detail access
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Saved local images stay in your Library.
          </p>
        </div>
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
