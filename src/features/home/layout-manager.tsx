import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  defaultDashboardItems,
  HOME_SECTIONS,
  type DashboardLayout,
} from '@/database/dashboard-layout';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useDashboardLayout } from './use-dashboard-layout';
function LayoutForm({
  initial,
  onClose,
  onBusyChange,
}: {
  initial: DashboardLayout;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { dashboardLayout } = useSpaceRepositories();
  const [revision] = useState(initial.updatedAt);
  const [items, setItems] = useState(initial.items);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();
  return (
    <form
      className="mt-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        onBusyChange(true);
        setError(undefined);
        void dashboardLayout
          .save(items, revision)
          .then(() => {
            storageWriteSucceeded();
            onClose();
          })
          .catch((cause: unknown) => {
            reportStorageError(cause);
            setError(
              cause instanceof Error
                ? cause.message
                : 'Layout could not be saved. Try again.',
            );
            setBusy(false);
            onBusyChange(false);
          });
      }}
    >
      <fieldset disabled={busy}>
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-lg border border-border p-3">
              <h3 className="font-semibold">{HOME_SECTIONS[item.id]}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, visible: event.target.checked }
                            : entry,
                        ),
                      )
                    }
                  />
                  Show {HOME_SECTIONS[item.id]}
                </label>
                <label className="field">
                  <span className="sr-only">
                    {HOME_SECTIONS[item.id]} width
                  </span>
                  <select
                    value={item.width}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? {
                                ...entry,
                                width: event.target.value as 'normal' | 'wide',
                              }
                            : entry,
                        ),
                      )
                    }
                  >
                    <option value="normal">Normal width</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                {([-1, 1] as const).map((direction) => (
                  <Button
                    key={direction}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      index + direction < 0 || index + direction >= items.length
                    }
                    aria-label={`${direction < 0 ? 'Move up' : 'Move down'}: ${HOME_SECTIONS[item.id]}`}
                    onClick={() => {
                      setItems((current) => {
                        const next = [...current];
                        [next[index], next[index + direction]] = [
                          next[index + direction]!,
                          next[index]!,
                        ];
                        return next;
                      });
                      setMessage(
                        `Moved ${HOME_SECTIONS[item.id]} to position ${index + direction + 1}.`,
                      );
                    }}
                  >
                    {direction < 0 ? 'Move up' : 'Move down'}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <Button
          className="mt-4"
          type="button"
          variant="outline"
          onClick={() => setItems(defaultDashboardItems())}
        >
          Reset layout
        </Button>
      </fieldset>
      <p className="mt-3 text-xs text-muted-foreground">
        Visibility does not enable optional content or change its settings.
        Hidden weather is not requested by Home. Reset restores section order,
        visibility and width only.
      </p>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message} Save to apply.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button disabled={busy}>Save layout</Button>
      </div>
    </form>
  );
}
export function LayoutManager({
  onClose,
  embedded = false,
}: {
  onClose: () => void;
  embedded?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const [busy, setBusy] = useState(false);
  const { layout, error } = useDashboardLayout();
  useEffect(() => {
    if (embedded) return;
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, [embedded]);
  const Container = embedded ? 'section' : 'dialog';
  return (
    <Container
      ref={embedded ? undefined : ref}
      aria-busy={busy}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      aria-labelledby="layout-title"
      className={embedded ? undefined : 'editor !max-w-2xl'}
    >
      <h2 id="layout-title" className="text-2xl font-semibold">
        Home layout
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Arrange the sections in this space. Changes apply when you save.
      </p>
      {layout ? (
        <LayoutForm initial={layout} onClose={onClose} onBusyChange={setBusy} />
      ) : (
        <>
          <p role={error ? 'alert' : 'status'} className="mt-4">
            {error ?? 'Loading layout…'}
          </p>
          <Button className="mt-4" onClick={onClose}>
            Done
          </Button>
        </>
      )}
    </Container>
  );
}
