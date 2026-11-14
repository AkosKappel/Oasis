import { Button } from '@/components/ui/button';
import { db } from '@/database/schema';
import { dismissStorageNotice, retryStorage } from '@/database/storage-health';
import { useStorageHealth } from './use-storage-health';
const messages = {
  quota: [
    'Storage is full',
    'Saved data was kept. Export backups or remove images, then retry the action that failed. Unsaved form fields stay in the open form.',
  ],
  unavailable: [
    'Storage is unavailable',
    'Oasis could not read local storage. Retry the connection. If your browser blocks site storage, allow it for this extension.',
  ],
  blocked: [
    'Storage upgrade is waiting',
    'Close other Oasis tabs or windows so the upgrade can finish, then retry.',
  ],
  updated: [
    'Oasis storage changed',
    'Another Oasis page updated storage. Copy any unsaved form text before reloading this page.',
  ],
};
export function StorageRecovery({
  onManageImages,
}: {
  onManageImages?: () => void;
}) {
  const health = useStorageHealth();
  if (!health.issue && !health.notice) return null;
  const content = health.issue ? messages[health.issue] : undefined;
  return (
    <section
      aria-label="Storage recovery"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-surface p-4 text-foreground shadow-xl"
    >
      {content ? (
        <div role="alert">
          <h2 className="text-sm font-semibold">{content[0]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{content[1]}</p>
        </div>
      ) : (
        <p role="status" className="text-sm">
          {health.notice}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {health.issue ? (
          <>
            <Button
              size="sm"
              disabled={health.retrying}
              onClick={() => void retryStorage(db)}
            >
              {health.retrying ? 'Retrying…' : 'Retry storage'}
            </Button>
            {health.issue === 'updated' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm(
                      'Reload Oasis? Unsaved form changes will be lost.',
                    )
                  )
                    window.location.reload();
                }}
              >
                Reload Oasis
              </Button>
            )}
            {onManageImages && (
              <Button size="sm" variant="outline" onClick={onManageImages}>
                Manage images
              </Button>
            )}
            <a
              href="/newtab.html#library"
              target="_blank"
              rel="noreferrer"
              className="rounded px-2 py-2 text-sm text-primary-content underline"
            >
              Open Library for backups
            </a>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={dismissStorageNotice}>
            Dismiss
          </Button>
        )}
      </div>
    </section>
  );
}
