import { useAppearance } from '@/features/appearance/use-appearance';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { BookmarkEditor } from '@/features/bookmarks/bookmark-editor';
import { useLibrary } from '@/features/bookmarks/use-library';
import { captureTab } from './capture-tab';
import type { BookmarkInput } from '@/database/bookmarks';

export function CaptureApp() {
  useAppearance();
  const { library, error: libraryError } = useLibrary();
  const [initialValues, setInitialValues] = useState<BookmarkInput>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
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
  }, []);
  return (
    <main className="p-5">
      {saved ? (
        <div role="status" className="py-8">
          <h1 className="text-xl font-semibold">Bookmark saved</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You can find it in your Personal library.
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
          onClose={() => window.close()}
          onSaved={() => setSaved(true)}
        />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Loading current page…
        </p>
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
