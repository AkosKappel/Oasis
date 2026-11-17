import { useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/types/entities';
import { checkLinks } from './check-links';
import {
  linkCheckPreview,
  linkPermission,
  MAX_CHECK_LINKS,
  resultLabel,
  type LinkCheckResult,
} from './link-checks';

export function LinkCheckDialog({
  bookmarks,
  onClose,
}: {
  bookmarks: Bookmark[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement),
    lock = useRef(false),
    controller = useRef<AbortController | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [results, setResults] = useState<LinkCheckResult[]>([]);
  const preview = useMemo(() => linkCheckPreview(bookmarks), [bookmarks]);
  const chosen = preview.rows.filter((row) => selected.has(row.url));
  const patterns = [...new Set(chosen.map((row) => linkPermission(row.url)))];
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      controller.current?.abort();
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This action could not be completed. Try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
      setChecking(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor !max-w-3xl"
      aria-labelledby="link-check-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
          controller.current?.abort();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="link-check-title" className="text-2xl font-semibold">
          Check links
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose up to 50 unique URLs from your current Library results. Selected
        sites receive the checked URLs and your IP address. Checks omit cookies
        and referrers, use HEAD requests and do not follow redirects.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        A login wall, redirect, server error or blocked request does not prove a
        link is broken. Even a successful response cannot verify its page
        content. Results are temporary, and bookmarks are never changed or
        deleted by a check.
      </p>
      <p className="mt-3 text-sm">
        {chosen.length} selected · {preview.total} unique URLs ·{' '}
        {preview.skipped} unsupported links skipped.
      </p>
      {preview.total > preview.rows.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the first 200 URLs. Filter Library to review other links.
        </p>
      )}
      <details
        open={reviewOpen}
        onToggle={(event) => {
          if (event.target === event.currentTarget)
            setReviewOpen(event.currentTarget.open);
        }}
        className="mt-3"
      >
        <summary className="cursor-pointer rounded py-1 text-sm">
          Review links and site access
        </summary>
        <div className="my-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || !preview.rows.length}
            onClick={() =>
              setSelected(
                new Set(
                  preview.rows.slice(0, MAX_CHECK_LINKS).map((row) => row.url),
                ),
              )
            }
          >
            Select first {Math.min(MAX_CHECK_LINKS, preview.rows.length)}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !chosen.length}
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
        <ul
          aria-label="Links to check"
          className="max-h-48 space-y-2 overflow-auto"
        >
          {preview.rows.map((row) => (
            <li key={row.url}>
              <label className="flex items-start gap-2 rounded border border-border p-2">
                <input
                  type="checkbox"
                  aria-label={`Check ${row.title}`}
                  disabled={
                    busy ||
                    (!selected.has(row.url) && chosen.length >= MAX_CHECK_LINKS)
                  }
                  checked={selected.has(row.url)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(row.url);
                    else next.delete(row.url);
                    setSelected(next);
                  }}
                />
                <span className="min-w-0">
                  <span className="block break-words text-sm">{row.title}</span>
                  <span className="block break-all text-xs text-muted-foreground">
                    {row.url}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {!!patterns.length && (
          <details className="my-3 text-xs">
            <summary className="cursor-pointer rounded py-1">
              Selected sites ({patterns.length})
            </summary>
            <p className="my-2 text-muted-foreground">
              Browser access covers all paths and ports on these site names.
              Requests use only the URLs you selected.
            </p>
            <ul className="space-y-1">
              {patterns.map((pattern) => (
                <li key={pattern} className="break-all">
                  {pattern}
                </li>
              ))}
            </ul>
          </details>
        )}
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !chosen.length}
          onClick={() =>
            void run(async () => {
              if (!(await browser.permissions.request({ origins: patterns })))
                throw new Error(
                  'Site access was not granted. No checks were started.',
                );
              setMessage(
                'Site access allowed. Choose Check selected links to start.',
              );
            })
          }
        >
          Allow selected sites
        </Button>
        <Button
          disabled={busy || !chosen.length}
          onClick={() =>
            void run(async () => {
              const cancel = new AbortController();
              controller.current = cancel;
              setChecking(true);
              setReviewOpen(false);
              setResults([]);
              const summary = await checkLinks(
                chosen.map((row) => ({ ...row })),
                cancel.signal,
                (result) => setResults((current) => [...current, result]),
              );
              setMessage(
                `${summary.stopped ? 'Stopped' : 'Completed'} after ${summary.completed} of ${chosen.length} checks.${summary.stopped ? ' Completed results are kept; a rate limit also stops the batch.' : ''}`,
              );
            })
          }
        >
          Check selected links
        </Button>
        {checking && (
          <Button variant="outline" onClick={() => controller.current?.abort()}>
            Stop checks
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy || !chosen.length}
          onClick={() => {
            if (
              !confirm(
                'Remove access for the selected sites? Other Oasis features using those sites may stop working too.',
              )
            )
              return;
            void run(async () => {
              if (!(await browser.permissions.remove({ origins: patterns })))
                throw new Error(
                  'Access could not be removed. Use the browser extension settings.',
                );
              setMessage(
                'Selected site access removed. No new requests will be made without access.',
              );
            });
          }}
        >
          Remove selected site access
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <p role="status" className="mt-4 text-sm">
        {checking ? `Checking links… ${results.length} completed.` : message}
      </p>
      {!!results.length && (
        <section aria-label="Link check results" className="mt-4">
          <h3 className="font-medium">Results for this run</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Checked URL snapshot. Results are cleared when this dialog closes.
          </p>
          <ul className="mt-2 space-y-2">
            {results.map((result) => (
              <li key={result.url} className="rounded border border-border p-3">
                <p className="break-words text-sm font-medium">
                  {result.title}
                </p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-xs underline"
                >
                  {result.url}
                </a>
                <p className="mt-2 text-sm">{resultLabel(result)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </dialog>
  );
}
