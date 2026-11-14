import type { Bookmark, Folder, Tag } from '@/types/entities';

interface OrganizationFiltersProps {
  bookmarks: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  folderId: string;
  tagId: string;
  onFolderChange: (id: string) => void;
  onTagChange: (id: string) => void;
}

export function OrganizationFilters({
  bookmarks,
  folders,
  tags,
  folderId,
  tagId,
  onFolderChange,
  onTagChange,
}: OrganizationFiltersProps) {
  const folderCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  let unorganized = 0;
  let untagged = 0;
  for (const bookmark of bookmarks) {
    if (bookmark.folderId)
      folderCounts.set(
        bookmark.folderId,
        (folderCounts.get(bookmark.folderId) ?? 0) + 1,
      );
    else unorganized++;
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
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name} ({folderCounts.get(folder.id) ?? 0})
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
