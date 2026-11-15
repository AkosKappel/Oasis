import type { DragEvent } from 'react';
import { useSpace } from '@/features/spaces/space-context';
import {
  DragOrganization,
  readOrganizationDrag,
  writeOrganizationDrag,
} from '@/features/organization/drag-organization';
import { StatisticsDialog } from '@/features/statistics/statistics-dialog';
import { smartCollection, type SmartCollection } from './smart-collections';
import { SpaceSwitcher } from '@/features/spaces/space-switcher';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { BookmarkNotesEditor } from './bookmark-notes-editor';
import { BulkEditor } from './bulk-editor';
import type { BulkBookmarkAction } from '@/database/bookmarks';
import { DuplicateReview } from '@/features/duplicates/duplicate-review';
import { useLibraryPreferences } from './use-library-preferences';
import { sortBookmarks } from './sort-bookmarks';
import { type LibraryPreferences } from '@/database/library-preferences';
import { folderPaths } from '@/features/organization/folder-tree';
import { BackupManager } from '@/features/backup/backup-manager';
import { BookmarkCard } from './bookmark-card';
import { useMemo, useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  Leaf,
  Plus,
  Search,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/types/entities';
import { BookmarkEditor } from './bookmark-editor';
import { useLibrary } from './use-library';
import { filterBookmarks } from './filter-bookmarks';
import { OrganizationManager } from '@/features/organization/organization-manager';
import { OrganizationFilters } from '@/features/organization/organization-filters';

export function BookmarkLibrary({
  initialQuery = '',
}: {
  initialQuery?: string;
}) {
  const {
    personalBookmarks,
    personalOrganization,
    personalLibraryPreferences,
    openHistory,
  } = useSpaceRepositories();
  const {
    preferences,
    error: preferencesError,
    setPreferences,
  } = useLibraryPreferences();
  const { spaceId } = useSpace();
  const [organizing, setOrganizing] = useState(false);
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [organizationMessage, setOrganizationMessage] = useState('');
  const [savingPreferences, setSavingPreferences] = useState(false);
  const { library, error: loadError } = useLibrary();
  const { bookmarks, folders = [], tags = [] } = library ?? {};
  const [resultLimit, setResultLimit] = useState(60);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkEditor, setBulkEditor] = useState<'move' | 'tags'>();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notesFor, setNotesFor] = useState<Bookmark>();
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const folderId =
    folderFilter === 'unorganized' ||
    folders.some((folder) => folder.id === folderFilter)
      ? folderFilter
      : '';
  const tagId =
    tagFilter === 'untagged' || tags.some((tag) => tag.id === tagFilter)
      ? tagFilter
      : '';
  const [editor, setEditor] = useState<{ bookmark?: Bookmark }>();
  const [query, setQuery] = useState(initialQuery);
  const [collection, setCollection] = useState<SmartCollection>('all');
  const favoritesOnly = collection === 'favorites';
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const filtered = useMemo(
    () =>
      bookmarks
        ? filterBookmarks(
            smartCollection(bookmarks, collection),
            folders,
            tags,
            {
              query,
              favoritesOnly,
              folderId,
              tagId,
            },
          )
        : undefined,
    [
      bookmarks,
      folders,
      tags,
      query,
      favoritesOnly,
      folderId,
      tagId,
      collection,
    ],
  );
  const visible = useMemo(
    () => (filtered ? sortBookmarks(filtered, preferences.sort) : undefined),
    [filtered, preferences.sort],
  );
  const displayed = visible?.slice(0, resultLimit);
  async function savePreferences(patch: Partial<LibraryPreferences>) {
    if (savingPreferences) return;
    const previous = preferences;
    setSavingPreferences(true);
    setPreferences({ ...preferences, ...patch });
    setError(undefined);
    try {
      await personalLibraryPreferences.save(patch);
    } catch (cause) {
      reportStorageError(cause);
      setPreferences(previous);
      setError('Your library view settings could not be saved. Try again.');
    } finally {
      setSavingPreferences(false);
    }
  }
  const activeSelected =
    visible
      ?.filter((bookmark) => selected.has(bookmark.id))
      .map((bookmark) => bookmark.id) ?? [];
  function clearSelection() {
    setSelected(new Set());
    setResultLimit(60);
  }
  function toggleSelection(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 1000) next.add(id);
    else {
      setError('Select up to 1,000 bookmarks at a time.');
      return;
    }
    setSelected(next);
  }
  async function applyBulk(action: BulkBookmarkAction) {
    await personalBookmarks.bulkUpdate(activeSelected, action);
    storageWriteSucceeded();
    clearSelection();
    setSelecting(false);
    setBulkEditor(undefined);
    requestAnimationFrame(() =>
      document.getElementById('bookmark-selection-toggle')?.focus(),
    );
  }
  async function deleteSelected() {
    if (!window.confirm(`Delete ${activeSelected.length} selected bookmarks?`))
      return;
    setBulkBusy(true);
    setError(undefined);
    try {
      await applyBulk({ kind: 'delete' });
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The selected bookmarks could not be deleted.',
      );
    } finally {
      setBulkBusy(false);
    }
  }
  const organizationFiltered =
    !!folderId ||
    !!tagId ||
    (collection !== 'all' && collection !== 'favorites');
  const paths = folderPaths(folders);
  const folderMap = new Map(
    folders.map((folder) => [
      folder.id,
      { ...folder, name: paths.get(folder.id)! },
    ]),
  );
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  const canReorder =
    preferences.sort === 'manual' &&
    !query.trim() &&
    !folderId &&
    !tagId &&
    collection === 'all';
  async function organize(
    action: () => Promise<unknown>,
    message: string,
    focusBookmark?: string,
  ) {
    if (organizationBusy) return;
    setOrganizationBusy(true);
    setError(undefined);
    setOrganizationMessage('');
    try {
      await action();
      storageWriteSucceeded();
      clearSelection();
      setOrganizationMessage(message);
      if (focusBookmark)
        requestAnimationFrame(() => {
          const row = [
            ...document.querySelectorAll<HTMLElement>('[data-bookmark-id]'),
          ].find((item) => item.dataset.bookmarkId === focusBookmark);
          row?.querySelector('a')?.focus();
        });
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'This item could not be organized. Try again.',
      );
    } finally {
      setOrganizationBusy(false);
    }
  }
  function dropInto(event: DragEvent, folder: string | null) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const item = readOrganizationDrag(event, spaceId);
      void organize(
        () =>
          item.kind === 'bookmark'
            ? personalBookmarks.bulkUpdate([item.id], {
                kind: 'move',
                folderId: folder ?? undefined,
              })
            : personalOrganization.moveFolder(item.id, folder),
        'Item moved.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Drag an Oasis item from this space.',
      );
    }
  }
  function dropBefore(event: DragEvent, target: string) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const item = readOrganizationDrag(event, spaceId);
      if (item.kind !== 'bookmark' || !canReorder)
        throw new Error(
          'Choose Manual bookmark order and clear filters to reorder bookmarks.',
        );
      void organize(
        () => personalBookmarks.reorder(item.id, target),
        'Bookmark order saved.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This item could not be reordered.',
      );
    }
  }
  async function remove(bookmark: Bookmark) {
    if (!window.confirm(`Delete “${bookmark.title}” from your library?`))
      return;
    setDeleting(bookmark.id);
    setError(undefined);
    try {
      await personalBookmarks.remove(bookmark.id);
    } catch (cause) {
      reportStorageError(cause);
      setError('The bookmark could not be deleted. Try again.');
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div className="min-h-screen">
      <button
        type="button"
        onClick={() => document.getElementById('library-main')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-3"
      >
        Skip to library
      </button>
      {backupOpen && <BackupManager onClose={() => setBackupOpen(false)} />}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Oasis home"
              className="flex items-center gap-3 text-xl font-semibold"
            >
              <Leaf
                className="size-6 text-primary-content"
                aria-hidden="true"
              />
              oasis
            </a>
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              Your personal space on the web
            </span>
          </div>
          <SpaceSwitcher />
        </div>
      </header>
      <main
        id="library-main"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">
              A little less searching. A little more finding.
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Your library
            </h1>
            <p className="mt-4 text-muted-foreground">
              Good places on the web, all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!library || !!loadError}
              onClick={() => setStatisticsOpen(true)}
            >
              Statistics
            </Button>
            <Button variant="outline" onClick={() => setBackupOpen(true)}>
              Backup and restore
            </Button>
            <Button
              variant="outline"
              onClick={() => setOrganizationOpen(true)}
              disabled={!bookmarks || !!loadError}
            >
              Folders and tags
            </Button>
            <Button
              variant="outline"
              disabled={!bookmarks || !!loadError}
              onClick={() => setDuplicatesOpen(true)}
            >
              Find duplicates
            </Button>
            <Button
              onClick={() => setEditor({})}
              disabled={!bookmarks || !!loadError}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add bookmark
            </Button>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Library filters"
          >
            <Button
              variant={collection === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setCollection('all');
                clearSelection();
              }}
              aria-pressed={collection === 'all'}
            >
              All bookmarks{' '}
              {bookmarks && (
                <span className="opacity-65">{bookmarks.length}</span>
              )}
            </Button>
            <Button
              variant={favoritesOnly ? 'default' : 'outline'}
              onClick={() => {
                setCollection('favorites');
                clearSelection();
              }}
              aria-pressed={favoritesOnly}
            >
              <Star className="size-4" aria-hidden="true" />
              Favorites
            </Button>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search bookmarks</span>
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                clearSelection();
              }}
              placeholder="Search or use tag:, folder:, domain:"
              aria-describedby="library-search-help"
              className="w-full rounded-md border border-border bg-surface/60 py-2 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        <p
          id="library-search-help"
          className="mt-3 text-xs text-muted-foreground"
        >
          Folder filters include subfolders. Search titles, URLs, notes, folders
          and tags. Use quotes for phrases or names with spaces, such as
          tag:"Read later". Best match uses recent additions when search is
          empty.
        </p>
        <label className="field mt-4 max-w-sm">
          Smart collection
          <select
            aria-label="Smart collection"
            value={collection}
            onChange={(event) => {
              setCollection(event.target.value as SmartCollection);
              clearSelection();
            }}
          >
            <option value="all">All bookmarks</option>
            <option value="recent">Recently added</option>
            <option value="favorites">Favorites</option>
            <option value="untagged">Untagged</option>
            <option value="unorganized">Unorganized</option>
            <option value="recently-opened">Recently opened</option>
            <option value="frequently-opened">Frequently opened</option>
          </select>
          <span className="text-xs font-normal text-muted-foreground">
            Recent and frequent collections include up to 50 bookmarks. Opened
            collections use saved counts; enable counting below to populate
            them. Folder, tag and search filters also apply.
          </span>
        </label>
        {bookmarks && (
          <OrganizationFilters
            bookmarks={bookmarks}
            folders={folders}
            tags={tags}
            folderId={folderId}
            tagId={tagId}
            onFolderChange={(value) => {
              setFolderFilter(value);
              clearSelection();
            }}
            onTagChange={(value) => {
              setTagFilter(value);
              clearSelection();
            }}
          />
        )}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-2" role="group" aria-label="Library view">
            <Button
              variant={preferences.view === 'grid' ? 'default' : 'outline'}
              size="sm"
              disabled={savingPreferences}
              aria-pressed={preferences.view === 'grid'}
              onClick={() => void savePreferences({ view: 'grid' })}
            >
              Grid view
            </Button>
            <Button
              variant={preferences.view === 'list' ? 'default' : 'outline'}
              size="sm"
              disabled={savingPreferences}
              aria-pressed={preferences.view === 'list'}
              onClick={() => void savePreferences({ view: 'list' })}
            >
              List view
            </Button>
          </div>
          <label className="field">
            Sort by
            <select
              disabled={savingPreferences}
              value={preferences.sort}
              onChange={(event) =>
                void savePreferences({
                  sort: event.target.value as LibraryPreferences['sort'],
                })
              }
            >
              <option value="relevance">Best match</option>
              <option value="manual">Manual order</option>
              <option value="name-asc">Name, A to Z</option>
              <option value="name-desc">Name, Z to A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={savingPreferences}
              checked={preferences.trackOpens ?? false}
              onChange={(event) =>
                void savePreferences({ trackOpens: event.target.checked })
              }
            />
            Count bookmark opens in Oasis
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                confirm(
                  'Clear open counts and last-opened times in this space?',
                )
              )
                void openHistory.clear().catch((cause: unknown) => {
                  reportStorageError(cause);
                  setError('Open history could not be cleared. Try again.');
                });
            }}
          >
            Clear open history
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Off by default. Counts only opens made from Oasis; other browsing
            activity is never tracked. Turning it off keeps existing counts
            until you clear them.
          </p>
        </div>
        <div className="mt-4">
          <Button
            id="bookmark-selection-toggle"
            variant="outline"
            size="sm"
            disabled={!bookmarks?.length || bulkBusy}
            onClick={() => {
              setSelecting(!selecting);
              clearSelection();
            }}
          >
            {selecting ? 'Cancel selection' : 'Select bookmarks'}
          </Button>
        </div>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!bookmarks || organizationBusy}
            aria-expanded={organizing}
            onClick={() => setOrganizing(!organizing)}
          >
            {organizing ? 'Done organizing' : 'Organize by dragging'}
          </Button>
        </div>
        {organizing && (
          <DragOrganization
            folders={folders}
            spaceId={spaceId}
            manual={preferences.folderOrder === 'manual'}
            busy={organizationBusy}
            onOrderChange={(manual) =>
              void savePreferences({ folderOrder: manual ? 'manual' : 'name' })
            }
            onFolderMove={(id, parent) =>
              void organize(
                () => personalOrganization.moveFolder(id, parent),
                'Folder moved.',
              )
            }
            onFolderOrder={(id, before) =>
              void organize(
                () => personalOrganization.reorderFolder(id, before),
                'Folder order saved.',
              )
            }
            onDrop={dropInto}
            onEdit={() => setOrganizationOpen(true)}
          />
        )}
        {organizing && !canReorder && (
          <p className="mt-3 text-xs text-muted-foreground">
            Choose Manual bookmark order and clear filters to reorder cards.
            Folder destinations work with any view.
          </p>
        )}
        {organizationMessage && (
          <p role="status" className="mt-3 text-sm">
            {organizationMessage}
          </p>
        )}
        {selecting && (
          <section
            aria-label="Bulk actions"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <p role="status" className="mr-2 text-sm">
              Selected: {activeSelected.length}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() =>
                setSelected(
                  new Set(
                    displayed?.slice(0, 1000).map((bookmark) => bookmark.id),
                  ),
                )
              }
            >
              Select visible
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={clearSelection}
            >
              Clear selection
            </Button>
            <Button
              size="sm"
              disabled={!activeSelected.length || bulkBusy}
              onClick={() => setBulkEditor('move')}
            >
              Move selected
            </Button>
            <Button
              size="sm"
              disabled={!activeSelected.length || bulkBusy}
              onClick={() => setBulkEditor('tags')}
            >
              Tag selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!activeSelected.length || bulkBusy}
              onClick={() => void deleteSelected()}
            >
              Delete selected
            </Button>
            {(visible?.length ?? 0) > 1000 && (
              <p className="w-full text-xs text-muted-foreground">
                Select visible selects up to 1,000 displayed results.
              </p>
            )}
          </section>
        )}
        {bulkEditor && (
          <BulkEditor
            kind={bulkEditor}
            count={activeSelected.length}
            folders={folders}
            tags={tags}
            onApply={applyBulk}
            onClose={() => setBulkEditor(undefined)}
          />
        )}
        {(loadError || error || preferencesError) && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            {loadError || error || preferencesError}
          </p>
        )}
        {!bookmarks && !loadError && (
          <p role="status" className="py-16 text-center text-muted-foreground">
            Opening your library…
          </p>
        )}
        {visible?.length === 0 && (
          <section className="flex flex-col items-center py-20 text-center">
            <BookmarkIcon
              className="mb-5 size-10 text-primary-content"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            <h2 className="text-xl font-medium">
              {query
                ? 'No matching bookmarks'
                : organizationFiltered
                  ? 'No bookmarks in this selection'
                  : favoritesOnly
                    ? 'Your favorites belong here'
                    : 'Make room for your next discovery'}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {query
                ? 'Try another title, URL, description, folder, or tag.'
                : organizationFiltered
                  ? 'Choose another folder or tag, or clear your filters.'
                  : favoritesOnly
                    ? 'Choose “Add to favorites” when saving or editing a bookmark.'
                    : 'Save a useful tool, a favorite read, or somewhere you want to return to.'}
            </p>
            {!query && !favoritesOnly && !organizationFiltered && (
              <Button className="mt-6" onClick={() => setEditor({})}>
                Save your first bookmark
              </Button>
            )}
          </section>
        )}
        {!!visible?.length && (
          <ul
            aria-label="Bookmarks"
            className={
              preferences.view === 'list'
                ? 'mt-7 flex flex-col gap-3'
                : 'mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {displayed?.map((bookmark, index) => (
              <BookmarkCard
                key={bookmark.id}
                onDragStart={
                  organizing
                    ? (event) =>
                        writeOrganizationDrag(event, {
                          kind: 'bookmark',
                          id: bookmark.id,
                          spaceId,
                        })
                    : undefined
                }
                onDropBefore={
                  organizing
                    ? (event) => dropBefore(event, bookmark.id)
                    : undefined
                }
                onMoveUp={
                  canReorder && index > 0
                    ? () =>
                        void organize(
                          () =>
                            personalBookmarks.reorder(
                              bookmark.id,
                              displayed[index - 1]!.id,
                            ),
                          'Bookmark order saved.',
                        )
                    : undefined
                }
                onMoveDown={
                  canReorder && index < visible.length - 1
                    ? () =>
                        void organize(
                          () =>
                            personalBookmarks.reorder(
                              bookmark.id,
                              visible[index + 2]?.id ?? null,
                            ),
                          'Bookmark order saved.',
                        )
                    : undefined
                }
                organizingBusy={organizationBusy}
                selected={selected.has(bookmark.id)}
                onSelect={
                  selecting ? () => toggleSelection(bookmark.id) : undefined
                }
                compact={preferences.view === 'list'}
                bookmark={bookmark}
                folder={folderMap.get(bookmark.folderId ?? '')}
                tags={bookmark.tags.flatMap((id) => {
                  const tag = tagMap.get(id);
                  return tag ? [tag] : [];
                })}
                deleting={!!deleting}
                onNotes={setNotesFor}
                onEdit={(bookmark) => setEditor({ bookmark })}
                onDelete={(bookmark) => void remove(bookmark)}
              />
            ))}
          </ul>
        )}
        {!!visible?.length && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              Showing {displayed?.length} of {visible.length} bookmarks
            </p>
            {resultLimit < visible.length && (
              <Button
                variant="outline"
                onClick={() => setResultLimit((limit) => limit + 60)}
              >
                Show more bookmarks
              </Button>
            )}
          </div>
        )}
        <p className="mt-10 text-xs text-muted-foreground">
          Saved on this device. Always your space.
        </p>
      </main>
      {statisticsOpen && library && (
        <StatisticsDialog
          library={library}
          tracking={preferences.trackOpens ?? false}
          onClose={() => setStatisticsOpen(false)}
        />
      )}
      {duplicatesOpen && bookmarks && (
        <DuplicateReview
          bookmarks={bookmarks}
          folders={folders}
          onClose={() => setDuplicatesOpen(false)}
        />
      )}
      {organizationOpen && (
        <OrganizationManager
          folders={folders}
          tags={tags}
          onClose={() => setOrganizationOpen(false)}
        />
      )}
      {notesFor && (
        <BookmarkNotesEditor
          bookmark={notesFor}
          onClose={() => setNotesFor(undefined)}
        />
      )}
      {editor && (
        <BookmarkEditor
          bookmark={editor.bookmark}
          folders={folders}
          tags={tags}
          defaultFolderId={folderId === 'unorganized' ? undefined : folderId}
          onClose={() => setEditor(undefined)}
        />
      )}
    </div>
  );
}
