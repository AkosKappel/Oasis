import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { HomeWidget } from '@/database/home-widgets';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
export function NoteEditor({
  widget,
  onClose,
}: {
  widget: Extract<HomeWidget, { kind: 'note' }>;
  onClose: () => void;
}) {
  const { personalHomeWidgets } = useSpaceRepositories();
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const [text, setText] = useState(widget.text),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    ref.current?.showModal();
    const focused = previous.current;
    return () => {
      if (focused instanceof HTMLElement)
        requestAnimationFrame(() => {
          if (focused.isConnected && document.activeElement === document.body)
            focused.focus();
        });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="editor"
      aria-labelledby="note-editor-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(undefined);
          void personalHomeWidgets
            .save({ ...widget, text }, widget.id, widget.updatedAt)
            .then(onClose)
            .catch((cause) => {
              reportStorageError(cause);
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Your note could not be saved.',
              );
              setBusy(false);
            });
        }}
      >
        <h2 id="note-editor-title" className="text-xl font-semibold">
          Edit {widget.label}
        </h2>
        <label className="field">
          Note text
          <textarea
            autoFocus
            maxLength={10000}
            rows={12}
            value={text}
            disabled={busy}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {text.length.toLocaleString()} / 10,000 characters
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={busy}>Save note</Button>
        </div>
      </form>
    </dialog>
  );
}
