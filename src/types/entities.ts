export interface RecordMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
export interface Space extends RecordMetadata {
  name: string;
  icon?: string;
  color?: string;
}
export interface Bookmark extends RecordMetadata {
  spaceId: string;
  folderId?: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  image?: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  sortOrder: number;
  lastOpenedAt?: number;
  openCount: number;
  customIcon?: string;
  customIconColor?: string;
}
export interface Folder extends RecordMetadata {
  spaceId: string;
  parentId?: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}
export interface Tag extends RecordMetadata {
  spaceId: string;
  name: string;
  color: string;
}
