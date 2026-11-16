import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import type { TrashItem } from '@/database/trash';
import { reportStorageError } from '@/database/storage-health';
type Removed = Pick<TrashItem, 'id' | 'kind'>;
const UndoContext = createContext<{
  offer: (items: Removed[], label: string) => void;
  notice: ReactNode;
}>({ offer: () => {}, notice: null });
export function UndoProvider({ children }: { children: ReactNode }) {
  const { trash } = useSpaceRepositories();
  const [pending, setPending] = useState<{
      items: Removed[];
      label: string;
      expires: number;
    }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    if (!pending || busy) return;
    const timer = window.setTimeout(
      () => setPending(undefined),
      Math.max(0, pending.expires - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [pending, busy]);
  const notice = pending ? (
    <div
      role="status"
      aria-busy={busy}
      className="my-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
    >
      <span>{pending.label} moved to Trash.</span>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(undefined);
          void trash
            .restore(pending.items)
            .then(() => setPending(undefined))
            .catch((cause) => {
              reportStorageError(cause);
              setError(
                'Undo could not complete. Open Trash to restore these items.',
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        Undo
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  ) : null;
  return (
    <UndoContext
      value={{
        offer: (items, label) => {
          setError(undefined);
          setPending({ items, label, expires: Date.now() + 10000 });
        },
        notice,
      }}
    >
      {children}
      <div
        id="global-undo"
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg"
      >
        {notice}
      </div>
    </UndoContext>
  );
}
export function useUndo() {
  return useContext(UndoContext);
}
export function UndoNotice() {
  return useUndo().notice;
}
