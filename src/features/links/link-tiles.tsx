import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Folder,
  History,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { Bookmark, Tag } from '@/types/entities';
import { BookmarkIcon } from '@/features/bookmarks/bookmark-icon';
import { TrackedBookmarkLink } from '@/features/bookmarks/tracked-bookmark-link';
import type { LinkFolderNode } from './link-groups';

export interface TileSection {
  id: 'favorites' | 'recent' | 'frequent';
  name: string;
  bookmarks: Bookmark[];
}

interface Place {
  id: string;
  name: string;
  folders: LinkFolderNode[];
  bookmarks: Bookmark[];
  section: boolean;
}

const sectionIcons = { favorites: Star, recent: History, frequent: TrendingUp };
const tileClass =
  'flex w-full min-w-0 flex-col items-center gap-1 rounded-md p-2 text-center text-xs hover:bg-secondary hover:text-secondary-foreground';

export function LinkTiles({
  folders,
  unorganized,
  sections,
  results,
  tags,
  organizing,
  busy,
  onMove,
  onOpen,
}: {
  folders: LinkFolderNode[];
  unorganized: Bookmark[];
  sections: TileSection[];
  results?: Bookmark[];
  tags: Tag[];
  organizing: boolean;
  busy: boolean;
  onMove: (id: string, before: string | null) => Promise<void>;
  onOpen: () => void;
}) {
  const [path, setPath] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
  const root: Place = {
    id: '',
    name: 'Links',
    folders,
    bookmarks: unorganized,
    section: false,
  };
  // Walk the saved path; a deleted or filtered-out folder falls back to its parent.
  const trail = [root];
  for (const id of path) {
    const current = trail.at(-1)!;
    const section = !current.id && sections.find((item) => item.id === id);
    const folder = current.folders.find((item) => item.id === id);
    if (section)
      trail.push({ ...section, folders: [], section: true } as Place);
    else if (folder)
      trail.push({
        id: folder.id,
        name: folder.name,
        folders: folder.children,
        bookmarks: folder.bookmarks,
        section: false,
      });
    else break;
  }
  const place = results
    ? { ...root, folders: [], bookmarks: results }
    : trail.at(-1)!;
  const canOrder = organizing && !place.section;
  const links = place.bookmarks.slice(0, limit);
  function enter(id: string) {
    setPath(
      trail
        .slice(1)
        .map((item) => item.id)
        .concat(id),
    );
    setLimit(50);
  }
  function drop(id: string, before: string) {
    if (
      canOrder &&
      !busy &&
      id !== before &&
      place.bookmarks.some((bookmark) => bookmark.id === id)
    )
      void onMove(id, before);
  }
  return (
    <div className="px-1">
      {!results && trail.length > 1 && (
        <nav aria-label="Folder path" className="mb-2 flex min-w-0 gap-1">
          <button
            type="button"
            aria-label="Back"
            title="Back"
            className="shrink-0 rounded p-1 hover:bg-secondary hover:text-secondary-foreground"
            onClick={() => setPath(trail.slice(1, -1).map((item) => item.id))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
            {trail.map((item, index) => (
              <li key={item.id || 'root'} className="flex min-w-0 gap-1">
                {index > 0 && <span aria-hidden="true">/</span>}
                {index === trail.length - 1 ? (
                  <span aria-current="location" className="truncate">
                    {item.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="truncate rounded underline-offset-2 hover:underline"
                    onClick={() =>
                      setPath(trail.slice(1, index + 1).map((step) => step.id))
                    }
                  >
                    {item.name}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <ul
        aria-label={results ? 'Matching links' : `${place.name} tiles`}
        className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1"
      >
        {!results &&
          !place.id &&
          sections.map((section) => {
            const Icon = sectionIcons[section.id];
            return (
              <FolderTile
                key={section.id}
                name={section.name}
                count={section.bookmarks.length}
                icon={<Icon className="size-6" aria-hidden="true" />}
                onOpen={() => enter(section.id)}
              />
            );
          })}
        {place.folders.map((folder) => (
          <FolderTile
            key={folder.id}
            name={folder.name}
            count={folder.count}
            icon={<Folder className="size-7" aria-hidden="true" />}
            onOpen={() => enter(folder.id)}
          />
        ))}
        {links.map((bookmark, index) => {
          const labels = bookmark.tags.flatMap((id) =>
            tagNames.has(id) ? [tagNames.get(id)!] : [],
          );
          return (
            <li
              key={bookmark.id}
              className="min-w-0"
              onDragOver={(event) => {
                if (
                  canOrder &&
                  !busy &&
                  event.dataTransfer.types.includes(
                    'application/x-oasis-home-link',
                  )
                )
                  event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                drop(
                  event.dataTransfer.getData('application/x-oasis-home-link'),
                  bookmark.id,
                );
              }}
            >
              <TrackedBookmarkLink
                bookmarkId={bookmark.id}
                data-bookmark
                href={bookmark.url}
                onClick={onOpen}
                draggable={canOrder && !busy ? true : undefined}
                onDragStart={(event) => {
                  if (!canOrder) return;
                  event.dataTransfer.setData(
                    'application/x-oasis-home-link',
                    bookmark.id,
                  );
                  event.dataTransfer.effectAllowed = 'move';
                }}
                title={`${bookmark.title}\n${bookmark.url}${labels.length ? `\nTags: ${labels.join(', ')}` : ''}`}
                className={`${tileClass} ${canOrder ? 'cursor-grab' : ''}`}
              >
                <BookmarkIcon bookmark={bookmark} large />
                <span className="line-clamp-2 w-full break-words">
                  {bookmark.title}
                </span>
                <span className="sr-only">
                  {bookmark.url}
                  {labels.length ? `, tags: ${labels.join(', ')}` : ''}
                </span>
              </TrackedBookmarkLink>
              {canOrder && (
                <span className="flex justify-center">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Move ${bookmark.title} earlier`}
                    className="rounded p-1 disabled:opacity-30"
                    onClick={() =>
                      void onMove(bookmark.id, place.bookmarks[index - 1]!.id)
                    }
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === place.bookmarks.length - 1}
                    aria-label={`Move ${bookmark.title} later`}
                    className="rounded p-1 disabled:opacity-30"
                    onClick={() =>
                      void onMove(
                        bookmark.id,
                        place.bookmarks[index + 2]?.id ?? null,
                      )
                    }
                  >
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!place.folders.length && !place.bookmarks.length && (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          {place.section ? 'No links in this section.' : 'Empty folder'}
        </p>
      )}
      {place.bookmarks.length > limit && (
        <button
          type="button"
          className="mt-2 rounded px-2 py-1 text-xs underline"
          onClick={() => setLimit(limit + 50)}
        >
          Show more links ({place.bookmarks.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

function FolderTile({
  name,
  count,
  icon,
  onOpen,
}: {
  name: string;
  count: number;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        title={name}
        aria-label={`Open ${name}, ${count} ${count === 1 ? 'link' : 'links'}`}
        className={tileClass}
        onClick={onOpen}
      >
        <span className="flex size-10 items-center justify-center">{icon}</span>
        <span className="line-clamp-2 w-full break-words">{name}</span>
      </button>
    </li>
  );
}
