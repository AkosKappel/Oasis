import { BackupManager } from '@/features/backup/backup-manager';
import { BookmarkCard } from './bookmark-card';
import { useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  Leaf,
  Plus,
  Search,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { personalBookmarks } from '@/database/bookmarks';
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
  const { library, error: loadError } = useLibrary();
  const { bookmarks, folders = [], tags = [] } = library ?? {};
  const [backupOpen, setBackupOpen] = useState(false);
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const visible = bookmarks
    ? filterBookmarks(bookmarks, folders, tags, {
        query,
        favoritesOnly,
        folderId,
        tagId,
      })
    : undefined;
  const organizationFiltered = !!folderId || !!tagId;
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  async function remove(bookmark: Bookmark) {
    if (!window.confirm(`Delete “${bookmark.title}” from your library?`))
      return;
    setDeleting(bookmark.id);
    setError(undefined);
    try {
      await personalBookmarks.remove(bookmark.id);
    } catch {
      setError('The bookmark could not be deleted. Try again.');
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div className="min-h-screen">
      {backupOpen && <BackupManager onClose={() => setBackupOpen(false)} />}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
          <a
            href="#"
            aria-label="Oasis home"
            className="flex items-center gap-3 text-xl font-semibold"
          >
            <Leaf className="size-6 text-primary" aria-hidden="true" />
            oasis
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              Your personal space on the web
            </span>
          </a>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Personal space
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
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
              onClick={() => setEditor({})}
              disabled={!bookmarks || !!loadError}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add bookmark
            </Button>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex gap-2" aria-label="Library filters">
            <Button
              variant={favoritesOnly ? 'outline' : 'default'}
              onClick={() => setFavoritesOnly(false)}
              aria-pressed={!favoritesOnly}
            >
              All bookmarks{' '}
              {bookmarks && (
                <span className="opacity-65">{bookmarks.length}</span>
              )}
            </Button>
            <Button
              variant={favoritesOnly ? 'default' : 'outline'}
              onClick={() => setFavoritesOnly(true)}
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your library"
              className="w-full rounded-md border border-border bg-surface/60 py-2 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        {bookmarks && (
          <OrganizationFilters
            bookmarks={bookmarks}
            folders={folders}
            tags={tags}
            folderId={folderId}
            tagId={tagId}
            onFolderChange={setFolderFilter}
            onTagChange={setTagFilter}
          />
        )}
        {(loadError || error) && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            {loadError || error}
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
              className="mb-5 size-10 text-primary"
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
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                folder={folderMap.get(bookmark.folderId ?? '')}
                tags={bookmark.tags.flatMap((id) => {
                  const tag = tagMap.get(id);
                  return tag ? [tag] : [];
                })}
                deleting={!!deleting}
                onEdit={(bookmark) => setEditor({ bookmark })}
                onDelete={(bookmark) => void remove(bookmark)}
              />
            ))}
          </ul>
        )}
        <p className="mt-10 text-xs text-muted-foreground">
          Saved on this device. Always your space.
        </p>
      </main>
      {organizationOpen && (
        <OrganizationManager
          folders={folders}
          tags={tags}
          onClose={() => setOrganizationOpen(false)}
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
