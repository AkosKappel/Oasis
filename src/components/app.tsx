import { Onboarding } from '@/features/settings/onboarding';
import {
  useSpace,
  useSpaceRepositories,
} from '@/features/spaces/space-context';
import { UndoProvider } from '@/features/settings/undo';
import { Settings, type SettingsPage } from '@/features/settings/settings';
import { SpaceProvider } from '@/features/spaces/space-context';
import { FocusModeDialog } from '@/features/focus/focus-mode';
import { StorageRecovery } from '@/features/storage/storage-recovery';
import type { Appearance } from '@/database/appearance';
import { useEffect, useState } from 'react';
import { BookmarkLibrary } from '@/features/bookmarks/bookmark-library';
import { CommandPalette } from '@/features/search/command-palette';
import { useAppearance } from '@/features/appearance/use-appearance';
import { Home } from '@/features/home/home';

export function App() {
  return (
    <SpaceProvider>
      <UndoProvider>
        <AppContent />
      </UndoProvider>
    </SpaceProvider>
  );
}

function AppContent() {
  const { spaceId, list } = useSpace();
  const { onboarding } = useSpaceRepositories();
  const [preview, setPreview] = useState<Appearance>();
  const {
    appearance,
    ready: appearanceReady,
    error: appearanceError,
    saveAppearance,
  } = useAppearance(preview);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>();
  const [focusOpen, setFocusOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);
  const [search, setSearch] = useState<{ query: string }>();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const links = document.getElementById('home-links');
        if (links?.hasAttribute('popover')) links.hidePopover();
        if (!document.querySelector('dialog[open]')) setSearch({ query: '' });
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    const navigate = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  return (
    <>
      <StorageRecovery onManageImages={() => setSettingsPage('albums')} />
      {route.split('?')[0] === '#library' ? (
        <BookmarkLibrary
          key={route}
          onSettings={setSettingsPage}
          initialQuery={new URLSearchParams(route.split('?')[1]).get('q') ?? ''}
        />
      ) : (
        <Home
          onPinLinks={(pinned) =>
            saveAppearance({ ...appearance, linksPinned: pinned })
          }
          onSettings={() => setSettingsPage('general')}
          onFocus={() => setFocusOpen(true)}
          appearance={preview ?? appearance}
          onSearch={(query) => setSearch({ query })}
        />
      )}
      {focusOpen && <FocusModeDialog onClose={() => setFocusOpen(false)} />}
      {settingsPage && (
        <Settings
          initialPage={settingsPage}
          appearance={appearance}
          onPreview={setPreview}
          onSave={saveAppearance}
          onClose={() => {
            setSettingsPage(undefined);
            setPreview(undefined);
          }}
        />
      )}
      {appearanceReady &&
        !setupDismissed &&
        spaceId === 'default' &&
        !list.find((space) => space.id === spaceId)?.setupComplete && (
          <Onboarding
            appearance={appearance}
            onFinish={async (value, importBookmarks) => {
              await onboarding.finish(value);
              setSetupDismissed(true);
              if (importBookmarks) setSettingsPage('data');
              else
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLButtonElement>(
                      'button[aria-label="Settings"]',
                    )
                    ?.focus(),
                );
            }}
          />
        )}
      {appearanceError && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 rounded bg-background p-3 text-sm text-danger"
        >
          {appearanceError}
        </p>
      )}
      {search && (
        <CommandPalette
          initialQuery={search.query}
          preferredEngine={appearance.searchEngine}
          onClose={() => setSearch(undefined)}
        />
      )}
    </>
  );
}
