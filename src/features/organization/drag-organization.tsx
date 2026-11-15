import { useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Folder } from '@/types/entities';
import { folderOptions } from './folder-tree';
export const ORGANIZATION_DRAG_TYPE = 'application/x-oasis-organization';
export interface OrganizationDrag {
  kind: 'bookmark' | 'folder';
  id: string;
  spaceId: string;
}
export function writeOrganizationDrag(
  event: DragEvent,
  value: OrganizationDrag,
) {
  event.dataTransfer.setData(ORGANIZATION_DRAG_TYPE, JSON.stringify(value));
  event.dataTransfer.effectAllowed = 'move';
}
export function readOrganizationDrag(
  event: DragEvent,
  spaceId: string,
): OrganizationDrag {
  let value: unknown;
  try {
    value = JSON.parse(event.dataTransfer.getData(ORGANIZATION_DRAG_TYPE));
  } catch {
    throw new Error('Drag an Oasis item from this space.');
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('kind' in value) ||
    !('id' in value) ||
    !('spaceId' in value) ||
    typeof value.kind !== 'string' ||
    !['bookmark', 'folder'].includes(value.kind) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    value.id.length > 200 ||
    value.spaceId !== spaceId
  )
    throw new Error('Drag an Oasis item from this space.');
  return value as OrganizationDrag;
}
export function DragOrganization({
  folders,
  spaceId,
  manual,
  busy,
  onOrderChange,
  onFolderMove,
  onFolderOrder,
  onDrop,
  onEdit,
}: {
  folders: Folder[];
  spaceId: string;
  manual: boolean;
  busy: boolean;
  onOrderChange: (manual: boolean) => void;
  onFolderMove: (id: string, parent: string | null) => void;
  onFolderOrder: (id: string, before: string | null) => void;
  onDrop: (event: DragEvent, folder: string | null) => void;
  onEdit: () => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const ordered = folderOptions(folders, manual);
  const matches = ordered.filter((folder) =>
    folder.path.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section
      aria-label="Drag organization"
      className="mt-4 rounded-lg border border-border bg-surface p-4"
    >
      <p className="text-sm">
        Drag a bookmark or folder onto a destination. Edit bookmarks or use
        Folders and tags to move with the keyboard. Ordering buttons are
        available in Manual order.
      </p>
      <label className="field mt-3 max-w-xs">
        Folder order
        <select
          value={manual ? 'manual' : 'name'}
          disabled={busy}
          onChange={(event) => onOrderChange(event.target.value === 'manual')}
        >
          <option value="name">Name</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <label className="field mt-3">
        Find a destination
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(100);
          }}
        />
      </label>
      <div
        role="group"
        aria-label="Drop destinations"
        className="mt-3 space-y-2"
      >
        <div
          className="rounded border border-dashed border-border p-3 text-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDrop(event, null)}
        >
          Drop in Unorganized / top-level folders
        </div>
        {matches.slice(0, limit).map((folder) => {
          const siblings = ordered.filter(
            (item) => item.parentId === folder.parentId,
          );
          const position = siblings.findIndex((item) => item.id === folder.id);
          return (
            <div
              key={folder.id}
              className="flex flex-wrap items-center gap-2 rounded border border-border p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, folder.id)}
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                draggable={!busy}
                disabled={busy}
                aria-label={`Drag folder ${folder.path}`}
                title="Drag to move. Click for folder controls."
                onDragStart={(event) =>
                  writeOrganizationDrag(event, {
                    kind: 'folder',
                    id: folder.id,
                    spaceId,
                  })
                }
                onClick={onEdit}
                className="max-w-full"
              >
                <span className="truncate">{folder.path}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || !manual || position === 0}
                onClick={() =>
                  onFolderOrder(folder.id, siblings[position - 1]!.id)
                }
                aria-label={`Move up: ${folder.path}`}
              >
                Move up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || !manual || position === siblings.length - 1}
                onClick={() =>
                  onFolderOrder(folder.id, siblings[position + 2]?.id ?? null)
                }
                aria-label={`Move down: ${folder.path}`}
              >
                Move down
              </Button>
              {folder.parentId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onFolderMove(folder.id, null)}
                >
                  Move to top level
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {limit < matches.length && (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setLimit((value) => value + 100)}
        >
          Show more folders
        </Button>
      )}
    </section>
  );
}
