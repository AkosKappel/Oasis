import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { personalQuotes, validateQuoteArchive } from '@/database/quotes';
import { useQuotes } from './use-quotes';
export function QuoteManager({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const { data, error: loadError } = useQuotes();
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [editingCollection, setEditingCollection] = useState<string>();
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [editingQuote, setEditingQuote] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  const collection =
    data?.collections.find((item) => item.id === selected) ??
    data?.collections[0];
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Quotes could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor !max-w-2xl"
      aria-labelledby="quotes-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="quotes-title" className="text-2xl font-semibold">
          Quote collections
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Your words, quotes and reminders. A daily entry can appear on Home.
      </p>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const id = await personalQuotes.saveCollection(
              name,
              editingCollection,
            );
            setSelected(id);
            setName('');
            setEditingCollection(undefined);
          });
        }}
      >
        <label className="field min-w-0 flex-1">
          {editingCollection ? 'Collection name' : 'New collection name'}
          <input
            maxLength={80}
            required
            disabled={busy}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button disabled={busy}>
          {editingCollection ? 'Save collection' : 'Create collection'}
        </Button>
        {editingCollection && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setEditingCollection(undefined);
              setName('');
            }}
          >
            Cancel rename
          </Button>
        )}
      </form>
      {collection && (
        <>
          <label className="field mt-5">
            Collection
            <select
              disabled={busy}
              value={collection.id}
              onChange={(event) => {
                setSelected(event.target.value);
                setEditingQuote(undefined);
                setText('');
                setAuthor('');
              }}
            >
              {data?.collections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setName(collection.name);
                setEditingCollection(collection.id);
              }}
            >
              Rename collection
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete collection “${collection.name}” and its quotes?`,
                  )
                )
                  void run(async () => {
                    await personalQuotes.remove(collection.id, 'collection');
                    setSelected('');
                  });
              }}
            >
              Delete collection
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await personalQuotes.setDisplay(collection.id, true);
                  setMessage('This collection is shown on Home.');
                })
              }
            >
              Show daily on Home
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await personalQuotes.setDisplay(undefined, false);
                  setMessage('Quotes hidden from Home.');
                })
              }
            >
              Hide quotes
            </Button>
          </div>
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await personalQuotes.saveQuote(
                  collection.id,
                  { text, author },
                  editingQuote,
                );
                setEditingQuote(undefined);
                setText('');
                setAuthor('');
                setMessage('Quote saved.');
              });
            }}
          >
            <label className="field">
              Quote
              <textarea
                required
                rows={3}
                maxLength={500}
                disabled={busy}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <label className="field">
              Author (optional)
              <input
                maxLength={120}
                disabled={busy}
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <Button disabled={busy}>
                {editingQuote ? 'Save quote' : 'Add quote'}
              </Button>
              {editingQuote && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setEditingQuote(undefined);
                    setText('');
                    setAuthor('');
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
          <ul className="mt-5 flex flex-col gap-3">
            {data?.quotes
              .filter((quote) => quote.collectionId === collection.id)
              .map((quote) => (
                <li
                  key={quote.id}
                  className="rounded-lg border border-border p-4"
                >
                  <p className="whitespace-pre-line break-words text-sm">
                    {quote.text}
                  </p>
                  {quote.author && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {quote.author}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Edit quote ${quote.text}`}
                      onClick={() => {
                        setEditingQuote(quote.id);
                        setText(quote.text);
                        setAuthor(quote.author);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Delete quote ${quote.text}`}
                      onClick={() => {
                        if (window.confirm('Delete this quote?'))
                          void run(() =>
                            personalQuotes.remove(quote.id, 'quote'),
                          );
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}
      <Button
        className="mt-5"
        variant="outline"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const url = URL.createObjectURL(
              new Blob(
                [JSON.stringify(await personalQuotes.export(), null, 2)],
                { type: 'application/json' },
              ),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = 'oasis-quotes.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage('Quote backup downloaded.');
          })
        }
      >
        Download quote backup
      </Button>
      <label className="field mt-4">
        Restore quote backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file)
              void run(async () => {
                if (file.size > 8 * 1024 * 1024)
                  throw new Error('Choose a quote backup smaller than 8 MB.');
                const archive = validateQuoteArchive(
                  JSON.parse(await file.text()),
                );
                if (
                  !window.confirm(
                    `Restore ${archive.quotes.length} quotes? Existing records stay unchanged.`,
                  )
                )
                  return;
                await personalQuotes.restore(archive);
                setMessage('Quotes restored.');
              });
          }}
        />
      </label>
      {(error || loadError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </dialog>
  );
}
