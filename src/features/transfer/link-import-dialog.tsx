import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_HTML_BYTES } from '@/database/bookmark-html';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { parseLinkText } from './parse-link-text';

export function LinkImportDialog({ onClose }: { onClose: () => void }) {
  const { personalBookmarkHtml } = useSpaceRepositories();
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const [text, setText] = useState('');
  const [folder, setFolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  const preview = useMemo(() => {
    if (!text.trim()) return undefined;
    try {
      const plan = parseLinkText(text, folder);
      return `Ready: ${plan.bookmarks.length} links${plan.skipped ? `, ${plan.skipped} unsafe or invalid skipped` : ''}.`;
    } catch (cause) {
      return cause instanceof Error ? cause.message : undefined;
    }
  }, [text, folder]);
  async function importLinks() {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await personalBookmarkHtml.import(
        parseLinkText(text, folder),
      );
      storageWriteSucceeded();
      setText('');
      setMessage(
        `Added ${result.bookmarks} links. Skipped ${result.duplicates} already saved and ${result.skipped} invalid.`,
      );
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The links could not be imported. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor !max-w-2xl"
      aria-labelledby="link-import-title"
      aria-busy={busy}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="link-import-title" className="text-2xl font-semibold">
          Import links
        </h2>
        <button
          type="button"
          aria-label="Close"
          title="Close"
          disabled={busy}
          onClick={onClose}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste links or choose a file. Oasis reads plain URLs, Markdown links,
        CSV and TSV rows, OneTab lists, JSON exports and bookmark HTML.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        <label className="field">
          Links
          <textarea
            rows={8}
            value={text}
            disabled={busy}
            placeholder={
              'https://example.com\n[Docs](https://example.com/docs)'
            }
            onChange={(event) => setText(event.target.value)}
            className="font-mono text-xs"
          />
        </label>
        <label className="field">
          <span className="flex items-center gap-2">
            <Upload className="size-4" aria-hidden="true" />
            Or choose a file
          </span>
          <input
            type="file"
            accept=".txt,.csv,.tsv,.md,.json,.html,.htm,text/*,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              setError(undefined);
              if (!file) return;
              if (file.size > MAX_HTML_BYTES)
                setError('Choose a file smaller than 10 MB.');
              else
                void file
                  .text()
                  .then(setText)
                  .catch(() => setError('The file could not be read.'));
            }}
          />
        </label>
        <label className="field">
          Folder (optional)
          <input
            maxLength={80}
            value={folder}
            disabled={busy}
            placeholder="Unorganized"
            onChange={(event) => setFolder(event.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          A folder with this name is created or reused. Links already saved in
          the same folder are skipped. Bookmark HTML keeps its own folders when
          no folder is set.
        </p>
        {preview && (
          <p role="status" className="text-sm">
            {preview}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !preview?.startsWith('Ready')}
            onClick={() => void importLinks()}
          >
            {busy ? 'Importing…' : 'Import links'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
