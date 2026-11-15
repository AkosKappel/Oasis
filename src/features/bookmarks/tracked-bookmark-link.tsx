import type { ComponentProps, MouseEvent } from 'react';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
export function TrackedBookmarkLink({
  bookmarkId,
  onClick,
  onAuxClick,
  ...props
}: ComponentProps<'a'> & { bookmarkId: string }) {
  const { openHistory } = useSpaceRepositories();
  function record(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || (event.button !== 0 && event.button !== 1))
      return;
    const destination = event.currentTarget.href;
    const sameTab =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      (!event.currentTarget.target || event.currentTarget.target === '_self');
    if (sameTab) event.preventDefault();
    void openHistory
      .record(bookmarkId)
      .catch(reportStorageError)
      .then(() => {
        if (sameTab) window.location.assign(destination);
      });
  }
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        record(event);
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) record(event);
      }}
    />
  );
}
