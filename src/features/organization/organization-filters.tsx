import { folderOptions } from './folder-tree';
import type { Bookmark, Folder, Tag } from '@/types/entities';

interface OrganizationFiltersProps {
  manualOrder?: boolean;
  bookmarks: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  folderId: string;
  tagId: string;
  onFolderChange: (id: string) => void;
  onTagChange: (id: string) => void;
}

export function OrganizationFilters({
  manualOrder = false,
  bookmarks,
  folders,
  tags,
  folderId,
  tagId,
  onFolderChange,
  onTagChange,
}: OrganizationFiltersProps) {
  const folderCounts = new Map<string, number>();
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const tagCounts = new Map<string, number>();
  let unorganized = 0;
  let untagged = 0;
  for (const bookmark of bookmarks) {
    if (bookmark.folderId) {
      const visited = new Set<string>();
      let id: string | undefined = bookmark.folderId;
      while (id && !visited.has(id)) {
        visited.add(id);
        folderCounts.set(id, (folderCounts.get(id) ?? 0) + 1);
        id = byId.get(id)?.parentId;
      }
    } else unorganized++;
    if (bookmark.tags.length === 0) untagged++;
    for (const tag of bookmark.tags)
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="field">
        Filter by folder
        <select
          value={folderId}
          onChange={(event) => onFolderChange(event.target.value)}
        >
          <option value="">All folders</option>
          <option value="unorganized">Unorganized ({unorganized})</option>
          {folderOptions(folders, manualOrder).map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.path} ({folderCounts.get(folder.id) ?? 0})
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Filter by tag
        <select
          value={tagId}
          onChange={(event) => onTagChange(event.target.value)}
        >
          <option value="">All tags</option>
          <option value="untagged">Untagged ({untagged})</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name} ({tagCounts.get(tag.id) ?? 0})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
