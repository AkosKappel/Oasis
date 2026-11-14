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

export interface ImageAlbum extends RecordMetadata {
  spaceId: string;
  name: string;
}
export interface AlbumImage extends RecordMetadata {
  spaceId: string;
  albumId: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}
export interface BackgroundSettings extends RecordMetadata {
  spaceId: string;
  albumId?: string;
  imageId?: string;
  rotateDaily: boolean;
  dimming: number;
}

export interface QuoteCollection extends RecordMetadata {
  spaceId: string;
  name: string;
}
export interface Quote extends RecordMetadata {
  spaceId: string;
  collectionId: string;
  text: string;
  author: string;
}
export interface QuoteSettings extends RecordMetadata {
  spaceId: string;
  collectionId?: string;
  visible: boolean;
}
