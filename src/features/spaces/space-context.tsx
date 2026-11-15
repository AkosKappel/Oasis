import { createContentFeedbackRepository } from '@/database/content-feedback';
import { createSpaceTransferRepository } from '@/database/space-transfer';
import { createDashboardLayoutRepository } from '@/database/dashboard-layout';
import { createOpenHistoryRepository } from '@/database/open-history';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { liveQuery } from 'dexie';
import { db } from '@/database/schema';
import { spaces } from '@/database/spaces';
import { reportStorageError } from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { StorageRecovery } from '@/features/storage/storage-recovery';
import type { Space } from '@/types/entities';
import { createBookmarkRepository } from '@/database/bookmarks';
import { createOrganizationRepository } from '@/database/organization';
import { createBookmarkNotesRepository } from '@/database/bookmark-notes';
import { createLibraryPreferencesRepository } from '@/database/library-preferences';
import { createAppearanceRepository } from '@/database/appearance';
import { createAlbumRepository } from '@/database/albums';
import { createQuoteRepository } from '@/database/quotes';
import { createDailyFocusRepository } from '@/database/daily-focus';
import { createHomeWidgetRepository } from '@/database/home-widgets';
import { createFocusSessionRepository } from '@/database/focus-session';
import { createWeatherRepository } from '@/database/weather';
import { createDuplicateRepository } from '@/database/duplicates';
import { createBackupRepository } from '@/database/backup';
import { createBookmarkHtmlRepository } from '@/database/bookmark-html';

const SpaceContext = createContext<{
  spaceId: string;
  list: Space[];
  select: (id: string) => void;
}>({ spaceId: 'default', list: [], select: () => {} });
const selectionKey = 'oasis:active-space';
function storedSelection() {
  try {
    return sessionStorage.getItem(selectionKey) ?? 'default';
  } catch {
    return 'default';
  }
}
export function SpaceProvider({ children }: { children: ReactNode }) {
  const { retryVersion } = useStorageHealth();
  const [selected, setSelected] = useState(storedSelection);
  const [list, setList] = useState<Space[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const sub = liveQuery(() => spaces.list()).subscribe({
      next: (value) => {
        setList(value);
        setError(false);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError(true);
      },
    });
    return () => sub.unsubscribe();
  }, [retryVersion]);
  const spaceId = list?.some((space) => space.id === selected)
    ? selected
    : 'default';
  function select(id: string) {
    if (!list?.some((space) => space.id === id)) return;
    try {
      sessionStorage.setItem(selectionKey, id);
    } catch {
      /* Keep selection in memory when browser storage is unavailable. */
    }
    setSelected(id);
  }
  if (!list)
    return (
      <>
        <StorageRecovery />
        <p role={error ? 'alert' : 'status'} className="p-6">
          {error
            ? 'Spaces could not be loaded. Use Retry storage.'
            : 'Opening your spaces…'}
        </p>
      </>
    );
  return (
    <SpaceContext value={{ spaceId, list, select }}>
      {error && (
        <p role="alert" className="p-4 text-sm text-danger">
          Spaces could not be refreshed. Your current view is kept. Use Retry
          storage.
        </p>
      )}
      <div key={spaceId}>{children}</div>
    </SpaceContext>
  );
}
export function useSpace() {
  return useContext(SpaceContext);
}
export function useSpaceRepositories() {
  const { spaceId } = useSpace();
  return useMemo(
    () => ({
      contentFeedback: createContentFeedbackRepository(spaceId),
      spaceTransfers: createSpaceTransferRepository(spaceId),
      dashboardLayout: createDashboardLayoutRepository(spaceId),
      openHistory: createOpenHistoryRepository(spaceId),
      personalBookmarks: createBookmarkRepository(spaceId),
      personalOrganization: createOrganizationRepository(spaceId),
      personalBookmarkNotes: createBookmarkNotesRepository(spaceId),
      personalLibraryPreferences: createLibraryPreferencesRepository(spaceId),
      personalAppearance: createAppearanceRepository(spaceId),
      personalAlbums: createAlbumRepository(spaceId),
      personalQuotes: createQuoteRepository(spaceId),
      personalDailyFocus: createDailyFocusRepository(spaceId),
      personalHomeWidgets: createHomeWidgetRepository(spaceId),
      personalFocusSession: createFocusSessionRepository(spaceId),
      personalWeather: createWeatherRepository(spaceId),
      personalDuplicates: createDuplicateRepository(spaceId),
      personalBackup: createBackupRepository(db, spaceId),
      personalBookmarkHtml: createBookmarkHtmlRepository(db, spaceId),
    }),
    [spaceId],
  );
}
