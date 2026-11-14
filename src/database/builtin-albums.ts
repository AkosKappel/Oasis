import type { AlbumImage, ImageAlbum } from '@/types/entities';

export const BUILTIN_ALBUMS = [
  {
    id: 'quiet-geometry',
    name: 'Quiet geometry',
    description: 'Angular landscapes in cool and warm tones.',
    images: [
      { id: 'jade-ridges', name: 'Jade ridges' },
      { id: 'desert-dusk', name: 'Desert dusk' },
      { id: 'snow-lines', name: 'Snow lines' },
    ],
  },
  {
    id: 'open-air',
    name: 'Open air',
    description: 'Room to breathe, from misty mountains to a sunlit coast.',
    images: [
      { id: 'morning-lake', name: 'Morning lake' },
      { id: 'quiet-coast', name: 'Quiet coast' },
      { id: 'green-valley', name: 'Green valley' },
    ],
  },
  {
    id: 'soft-forms',
    name: 'Soft forms',
    description: 'Gentle abstract shapes with warm and cool palettes.',
    images: [
      { id: 'warm-folds', name: 'Warm folds' },
      { id: 'cool-drift', name: 'Cool drift' },
      { id: 'sage-waves', name: 'Sage waves' },
    ],
  },
  {
    id: 'after-dark',
    name: 'After dark',
    description: 'Quiet night skies and distant lights.',
    images: [
      { id: 'moonlit-dunes', name: 'Moonlit dunes' },
      { id: 'distant-lights', name: 'Distant lights' },
      { id: 'northern-lights', name: 'Northern lights' },
    ],
  },
  {
    id: 'woodland',
    name: 'Woodland',
    description: 'Soft forest light, ferns and misty bamboo.',
    images: [
      { id: 'fern-path', name: 'Fern path' },
      { id: 'bamboo-rain', name: 'Bamboo rain' },
    ],
  },
  {
    id: 'quiet-spaces',
    name: 'Quiet spaces',
    description: 'Sunlit arches and sheltered views on rainy evenings.',
    images: [
      { id: 'sunlit-arch', name: 'Sunlit arch' },
      { id: 'rainy-window', name: 'Rainy window' },
    ],
  },
] as const;

export function builtinAlbumId(id: string) {
  return `oasis:builtin:${id}`;
}
export function isBuiltinAlbum(id: string) {
  return BUILTIN_ALBUMS.some((album) => builtinAlbumId(album.id) === id);
}
export function builtinAlbums(spaceId: string): {
  albums: ImageAlbum[];
  images: AlbumImage[];
} {
  const metadata = { spaceId, createdAt: 0, updatedAt: 0 };
  return {
    albums: BUILTIN_ALBUMS.map((album) => ({
      ...metadata,
      id: builtinAlbumId(album.id),
      name: album.name,
    })),
    images: BUILTIN_ALBUMS.flatMap((album) =>
      album.images.map((image, index) => ({
        ...metadata,
        id: builtinAlbumId(image.id),
        albumId: builtinAlbumId(album.id),
        name: image.name,
        dataUrl: `/albums/${image.id}.webp`,
        width: 1586,
        height: 992,
        createdAt: index,
      })),
    ),
  };
}
