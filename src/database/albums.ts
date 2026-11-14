import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace, requireUniqueName } from './records';
import type { AlbumImage, ImageAlbum } from '@/types/entities';

export const MAX_ALBUM_BYTES = 30 * 1024 * 1024;
export const MAX_ALBUM_IMAGES = 100;
export interface PreparedImage {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}
export interface AlbumArchive {
  format: 'oasis-albums';
  version: 1;
  albums: ImageAlbum[];
  images: AlbumImage[];
}
export function validateImage(image: PreparedImage): PreparedImage {
  if (
    typeof image.name !== 'string' ||
    !image.name.trim() ||
    image.name.length > 120 ||
    typeof image.dataUrl !== 'string' ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl)
  )
    throw new Error('Choose a valid JPEG image.');
  const bytes = atob(image.dataUrl.split(',')[1]!);
  if (
    bytes.length > 3 * 1024 * 1024 ||
    bytes.charCodeAt(0) !== 255 ||
    bytes.charCodeAt(1) !== 216 ||
    bytes.charCodeAt(2) !== 255 ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    image.width > 2560 ||
    image.height > 2560
  )
    throw new Error(
      'Images must fit within 2560 pixels and 3 MB after resizing.',
    );
  return {
    name: image.name.trim(),
    dataUrl: image.dataUrl,
    width: image.width,
    height: image.height,
  };
}
const bytes = (image: PreparedImage) =>
  Math.floor((image.dataUrl.split(',')[1]!.length * 3) / 4);
function archiveMetadata(value: ImageAlbum) {
  if (
    typeof value.id !== 'string' ||
    !value.id ||
    value.id.length > 200 ||
    value.spaceId !== 'default' ||
    value.deletedAt !== undefined ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    !Number.isSafeInteger(value.updatedAt) ||
    value.updatedAt < 0
  )
    throw new Error('The album backup contains invalid records.');
  return {
    id: value.id,
    spaceId: 'default',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}
function albumName(name: string) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    throw new Error('Keep album names between 1 and 80 characters.');
  return name.trim();
}
export function validateAlbumArchive(input: AlbumArchive): AlbumArchive {
  if (
    !input ||
    input.format !== 'oasis-albums' ||
    input.version !== 1 ||
    !Array.isArray(input.albums) ||
    !Array.isArray(input.images) ||
    input.albums.length > 50 ||
    input.images.length > MAX_ALBUM_IMAGES
  )
    throw new Error(
      'Choose an Oasis album backup with up to 50 albums and 100 images.',
    );
  const albums = input.albums.map((album) => ({
    ...archiveMetadata(album),
    name: albumName(album.name),
  }));
  const images = input.images.map((image) => ({
    ...archiveMetadata(image),
    ...validateImage(image),
    albumId: image.albumId,
  }));
  const ids = new Set(albums.map((album) => album.id));
  if (
    ids.size !== albums.length ||
    new Set(albums.map((album) => album.name.toLowerCase())).size !==
      albums.length ||
    new Set(images.map((image) => image.id)).size !== images.length ||
    images.some((image) => !ids.has(image.albumId)) ||
    images.reduce((sum, image) => sum + bytes(image), 0) > MAX_ALBUM_BYTES
  )
    throw new Error(
      'The album backup has duplicate names, invalid relationships or too much image data.',
    );
  return { format: 'oasis-albums', version: 1, albums, images };
}
export function createAlbumRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const backgroundId = `${spaceId}:background`;
  async function active() {
    const [albums, images] = await Promise.all([
      database.albums
        .where('spaceId')
        .equals(spaceId)
        .filter((item) => item.deletedAt === undefined)
        .sortBy('name'),
      database.albumImages
        .where('spaceId')
        .equals(spaceId)
        .filter((item) => item.deletedAt === undefined)
        .sortBy('createdAt'),
    ]);
    return { albums, images };
  }
  async function background() {
    const existing = await database.backgrounds.get(backgroundId);
    if (
      existing &&
      (existing.spaceId !== spaceId || existing.deletedAt !== undefined)
    )
      throw new Error('Background settings are unavailable.');
    return existing;
  }
  return {
    async list() {
      return database.transaction(
        'r',
        database.spaces,
        database.albums,
        database.albumImages,
        database.backgrounds,
        async () => {
          await requireSpace(database, spaceId);
          return { ...(await active()), background: await background() };
        },
      );
    },
    async saveAlbum(name: string, id?: string) {
      const value = albumName(name);
      return database.transaction(
        'rw',
        database.spaces,
        database.albums,
        async () => {
          await requireSpace(database, spaceId);
          if (id)
            await requireOwnedRecord(database.albums, id, spaceId, 'album');
          await requireUniqueName(database.albums, spaceId, value, id, 'album');
          const now = Date.now();
          if (id) {
            await database.albums.update(id, { name: value, updatedAt: now });
            return id;
          }
          if (
            (await database.albums
              .where('spaceId')
              .equals(spaceId)
              .filter((item) => item.deletedAt === undefined)
              .count()) >= 50
          )
            throw new Error('Keep up to 50 albums.');
          const record = {
            id: crypto.randomUUID(),
            spaceId,
            name: value,
            createdAt: now,
            updatedAt: now,
          };
          await database.albums.add(record);
          return record.id;
        },
      );
    },
    async addImages(albumId: string, input: PreparedImage[]) {
      const prepared = input.map(validateImage);
      await database.transaction(
        'rw',
        database.spaces,
        database.albums,
        database.albumImages,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(database.albums, albumId, spaceId, 'album');
          const images = (await active()).images;
          if (
            images.length + prepared.length > MAX_ALBUM_IMAGES ||
            [...images, ...prepared].reduce(
              (sum, image) => sum + bytes(image),
              0,
            ) > MAX_ALBUM_BYTES
          )
            throw new Error(
              'Keep up to 100 images and 30 MB of image data. Remove images or export an album backup first.',
            );
          const now = Date.now();
          await database.albumImages.bulkAdd(
            prepared.map((image, index) => ({
              ...image,
              id: crypto.randomUUID(),
              spaceId,
              albumId,
              createdAt: now + index,
              updatedAt: now,
            })),
          );
        },
      );
    },
    async setBackground(
      albumId?: string,
      imageId?: string,
      options?: { rotateDaily: boolean; dimming: number },
    ) {
      if (
        options &&
        (typeof options.rotateDaily !== 'boolean' ||
          !Number.isFinite(options.dimming) ||
          options.dimming < 0.6 ||
          options.dimming > 0.85)
      )
        throw new Error('Choose a dimming level from 60% to 85%.');
      await database.transaction(
        'rw',
        database.spaces,
        database.albums,
        database.albumImages,
        database.backgrounds,
        async () => {
          await requireSpace(database, spaceId);
          if (albumId)
            await requireOwnedRecord(
              database.albums,
              albumId,
              spaceId,
              'album',
            );
          if (imageId) {
            const image = await requireOwnedRecord(
              database.albumImages,
              imageId,
              spaceId,
              'image',
            );
            if (image.albumId !== albumId)
              throw new Error('Choose an image from this album.');
          }
          const existing = await background();
          const now = Date.now();
          await database.backgrounds.put({
            id: backgroundId,
            spaceId,
            albumId,
            imageId,
            rotateDaily: options?.rotateDaily ?? existing?.rotateDaily ?? false,
            dimming: options?.dimming ?? existing?.dimming ?? 0.6,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
    async remove(id: string, kind: 'album' | 'image') {
      await database.transaction(
        'rw',
        database.spaces,
        database.albums,
        database.albumImages,
        database.backgrounds,
        async () => {
          await requireSpace(database, spaceId);
          const now = Date.now();
          const settings = await background();
          if (kind === 'album') {
            await requireOwnedRecord(database.albums, id, spaceId, 'album');
            await database.albums.update(id, {
              deletedAt: now,
              updatedAt: now,
            });
            await database.albumImages
              .where('[spaceId+albumId]')
              .equals([spaceId, id])
              .filter((image) => image.deletedAt === undefined)
              .modify({ deletedAt: now, updatedAt: now, dataUrl: '' });
          } else {
            await requireOwnedRecord(
              database.albumImages,
              id,
              spaceId,
              'image',
            );
            await database.albumImages.update(id, {
              deletedAt: now,
              updatedAt: now,
              dataUrl: '',
            });
          }
          if (
            settings &&
            ((kind === 'album' && settings.albumId === id) ||
              (kind === 'image' && settings.imageId === id))
          )
            await database.backgrounds.update(backgroundId, {
              ...(kind === 'album' ? { albumId: undefined } : {}),
              imageId: undefined,
              updatedAt: now,
            });
        },
      );
    },
    async export(): Promise<AlbumArchive> {
      const data = await this.list();
      return validateAlbumArchive({
        format: 'oasis-albums',
        version: 1,
        albums: data.albums,
        images: data.images,
      });
    },
    async restore(input: AlbumArchive) {
      const archive = validateAlbumArchive(input);
      await database.transaction(
        'rw',
        database.spaces,
        database.albums,
        database.albumImages,
        async () => {
          await requireSpace(database, spaceId);
          if (spaceId !== 'default')
            throw new Error(
              'Album backups currently restore to Personal only.',
            );
          const current = await active();
          const albums = [...current.albums];
          const images = [...current.images];
          const additions = {
            albums: [] as ImageAlbum[],
            images: [] as AlbumImage[],
          };
          for (const album of archive.albums) {
            const existing = await database.albums.get(album.id);
            if (existing) {
              if (
                existing.spaceId !== spaceId ||
                existing.deletedAt !== undefined
              )
                throw new Error(
                  'A backup ID is unavailable. Restore into a fresh profile.',
                );
            } else {
              albums.push(album);
              additions.albums.push(album);
            }
          }
          for (const image of archive.images) {
            const existing = await database.albumImages.get(image.id);
            if (existing) {
              if (
                existing.spaceId !== spaceId ||
                existing.deletedAt !== undefined ||
                existing.albumId !== image.albumId
              )
                throw new Error('A backup image ID is unavailable.');
            } else {
              images.push(image);
              additions.images.push(image);
            }
          }
          validateAlbumArchive({
            format: 'oasis-albums',
            version: 1,
            albums,
            images,
          });
          await database.albums.bulkAdd(additions.albums);
          await database.albumImages.bulkAdd(additions.images);
          return additions;
        },
      );
    },
  };
}
export const personalAlbums = createAlbumRepository('default');
