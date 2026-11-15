import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import { builtinAlbums } from './builtin-albums';
import type { RecordMetadata } from '@/types/entities';
export type ContentKind = 'image' | 'quote';
export type ContentRating = 'like' | 'dislike';
export interface ContentFeedback extends RecordMetadata {
  spaceId: string;
  kind: ContentKind;
  itemId: string;
  rating: ContentRating;
}
export function createContentFeedbackRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async list() {
      await requireSpace(database, spaceId);
      return database.contentFeedback
        .where('spaceId')
        .equals(spaceId)
        .filter((record) => record.deletedAt === undefined)
        .toArray();
    },
    async clear(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.contentFeedback,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(
            database.contentFeedback,
            id,
            spaceId,
            'preference',
          );
          const now = Date.now();
          await database.contentFeedback.update(id, {
            deletedAt: now,
            updatedAt: now,
          });
        },
      );
    },
    async reset(kind?: ContentKind) {
      if (kind !== undefined && !['image', 'quote'].includes(kind))
        throw new Error('Choose backgrounds or quotes to clear.');
      await database.transaction(
        'rw',
        database.spaces,
        database.contentFeedback,
        async () => {
          await requireSpace(database, spaceId);
          const now = Date.now();
          await database.contentFeedback
            .where('spaceId')
            .equals(spaceId)
            .filter(
              (record) =>
                record.deletedAt === undefined &&
                (kind === undefined || record.kind === kind),
            )
            .modify({ deletedAt: now, updatedAt: now });
        },
      );
    },
    async rate(
      kind: ContentKind,
      itemId: string,
      rating: ContentRating | null,
    ) {
      if (
        !['image', 'quote'].includes(kind) ||
        typeof itemId !== 'string' ||
        !itemId ||
        itemId.length > 200 ||
        ![null, 'like', 'dislike'].includes(rating)
      )
        throw new Error('Choose a valid image or quote preference.');
      return database.transaction(
        'rw',
        database.spaces,
        database.albumImages,
        database.quotes,
        database.contentFeedback,
        async () => {
          await requireSpace(database, spaceId);
          if (kind === 'quote')
            await requireOwnedRecord(database.quotes, itemId, spaceId, 'quote');
          else if (
            !builtinAlbums(spaceId).images.some((image) => image.id === itemId)
          )
            await requireOwnedRecord(
              database.albumImages,
              itemId,
              spaceId,
              'image',
            );
          const id = JSON.stringify([spaceId, kind, itemId]);
          const previous = await database.contentFeedback.get(id);
          if (previous && previous.spaceId !== spaceId)
            throw new Error('This preference belongs to another space.');
          const now = Date.now();
          if (rating === null) {
            if (previous)
              await database.contentFeedback.update(id, {
                deletedAt: now,
                updatedAt: now,
              });
          } else
            await database.contentFeedback.put({
              id,
              spaceId,
              kind,
              itemId,
              rating,
              createdAt: previous?.createdAt ?? now,
              updatedAt: now,
            });
        },
      );
    },
  };
}
