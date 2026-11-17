import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/types/entities';
import {
  MAX_HIGHLIGHT_NOTE,
  type PageHighlight,
  type PageText,
} from '@/database/page-texts';
import { reportStorageError } from '@/database/storage-health';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { downloadWidgetText } from '@/features/widgets/download-text';

/** First occurrence of a phrase that does not overlap an existing highlight. */
export function findHighlightRange(
  text: string,
  phrase: string,
  highlights: Pick<PageHighlight, 'start' | 'end'>[],
) {
  const needle = phrase.trim();
  if (!needle) return;
  const lower = text.toLowerCase(),
    target = needle.toLowerCase();
  for (
    let start = lower.indexOf(target);
    start >= 0;
    start = lower.indexOf(target, start + 1)
  ) {
    const end = start + needle.length;
    if (!highlights.some((item) => start < item.end && end > item.start))
      return { start, end };
  }
}

function segments(record: PageText) {
  const parts: { start: number; end: number; highlight?: PageHighlight }[] = [];
  let cursor = 0;
  for (const highlight of record.highlights) {
    if (highlight.start > cursor)
      parts.push({ start: cursor, end: highlight.start });
    parts.push({ start: highlight.start, end: highlight.end, highlight });
    cursor = highlight.end;
  }
  if (cursor < record.text.length)
    parts.push({ start: cursor, end: record.text.length });
  return parts;
}

export function PageTextDialog({
  bookmark,
  onClose,
}: {
  bookmark: Bookmark;
  onClose: () => void;
}) {
  const { pageTexts } = useSpaceRepositories();
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const [record, setRecord] = useState<PageText | null>();
  const [phrase, setPhrase] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  useEffect(() => {
    const subscription = liveQuery(() => pageTexts.get(bookmark.id)).subscribe({
      next: (value) => setRecord(value ?? null),
      error: (cause) => {
        reportStorageError(cause, true);
        setError('The page text could not be loaded. Use Retry storage.');
      },
    });
    return () => subscription.unsubscribe();
  }, [pageTexts, bookmark.id]);
  async function act(action: () => Promise<void>, done: string) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
      setMessage(done);
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The page text could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="editor !max-w-3xl"
      aria-labelledby="page-text-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="page-text-title" className="text-2xl font-semibold">
          Page text
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="mt-2 break-words text-sm">{bookmark.title}</p>
      {record === null && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          This bookmark has no saved page text.
        </p>
      )}
      {record && (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved {new Date(record.capturedAt).toLocaleString()} ·{' '}
            {record.text.length.toLocaleString()} characters · stored only in
            this browser.
          </p>
          <section
            aria-label="Saved page text"
            tabIndex={0}
            className="mt-3 max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded border border-border p-3 text-sm leading-relaxed"
          >
            {segments(record).map((part) =>
              part.highlight ? (
                <mark
                  key={part.start}
                  title={part.highlight.note}
                  className="rounded bg-primary/25 text-foreground"
                >
                  {record.text.slice(part.start, part.end)}
                </mark>
              ) : (
                <span key={part.start}>
                  {record.text.slice(part.start, part.end)}
                </span>
              ),
            )}
          </section>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const range = findHighlightRange(
                record.text,
                phrase,
                record.highlights,
              );
              if (!range) {
                setError(
                  'That text was not found, or it is already highlighted.',
                );
                return;
              }
              void act(async () => {
                await pageTexts.addHighlight(
                  bookmark.id,
                  record.updatedAt,
                  range.start,
                  range.end,
                  note,
                );
                setPhrase('');
                setNote('');
              }, 'Highlight added.');
            }}
          >
            <label className="field">
              Text to highlight
              <input
                value={phrase}
                required
                maxLength={2000}
                disabled={busy}
                onChange={(event) => setPhrase(event.target.value)}
              />
            </label>
            <label className="field">
              Highlight note{' '}
              <span className="text-xs font-normal text-muted-foreground">
                Optional
              </span>
              <input
                value={note}
                maxLength={MAX_HIGHLIGHT_NOTE}
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  setPhrase(window.getSelection()?.toString().trim() ?? '')
                }
              >
                Use selected text
              </Button>
              <Button disabled={busy}>Add highlight</Button>
            </div>
          </form>
          {!!record.highlights.length && (
            <section aria-label="Highlights" className="mt-4">
              <h3 className="font-medium">
                Highlights ({record.highlights.length})
              </h3>
              <ul className="mt-2 space-y-2">
                {record.highlights.map((highlight) => {
                  const quote = record.text.slice(
                    highlight.start,
                    highlight.end,
                  );
                  const draft = notes[highlight.id] ?? highlight.note ?? '';
                  return (
                    <li
                      key={highlight.id}
                      className="rounded border border-border p-3 text-sm"
                    >
                      <blockquote className="break-words border-l-2 border-primary pl-2">
                        {quote.length > 300 ? `${quote.slice(0, 300)}…` : quote}
                      </blockquote>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <label className="field min-w-0 flex-1">
                          <span className="sr-only">
                            Note for “{quote.slice(0, 40)}”
                          </span>
                          <input
                            value={draft}
                            placeholder="Add a note"
                            maxLength={MAX_HIGHLIGHT_NOTE}
                            disabled={busy}
                            onChange={(event) =>
                              setNotes({
                                ...notes,
                                [highlight.id]: event.target.value,
                              })
                            }
                          />
                        </label>
                        <Button
                          variant="outline"
                          disabled={busy || draft === (highlight.note ?? '')}
                          onClick={() =>
                            void act(
                              () =>
                                pageTexts.updateHighlight(
                                  bookmark.id,
                                  record.updatedAt,
                                  highlight.id,
                                  draft,
                                ),
                              'Note saved.',
                            )
                          }
                        >
                          Save note
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              () =>
                                pageTexts.removeHighlight(
                                  bookmark.id,
                                  record.updatedAt,
                                  highlight.id,
                                ),
                              'Highlight removed.',
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                downloadWidgetText(
                  `${bookmark.title}\n${bookmark.url}\n\n${record.text}\n`,
                  'page-text.txt',
                )
              }
            >
              Download text
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (
                  !confirm(
                    'Remove the saved text and its highlights? The bookmark is kept.',
                  )
                )
                  return;
                void act(
                  () => pageTexts.remove(bookmark.id, record.updatedAt),
                  'Page text removed.',
                );
              }}
            >
              Remove text copy
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </dialog>
  );
}
