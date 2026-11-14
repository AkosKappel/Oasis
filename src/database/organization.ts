import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';

export interface TagInput {
  name: string;
  color: string;
}

function validateName(name: string) {
  const value = name.trim();
  if (!value) throw new Error('Enter a name.');
  if (value.length > 80)
    throw new Error('Keep names to 80 characters or fewer.');
  return value;
}

export function createOrganizationRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async list() {
      await requireSpace(database, spaceId);
      const [folders, tags] = await Promise.all([
        database.folders
          .where('spaceId')
          .equals(spaceId)
          .filter((item) => item.deletedAt === undefined)
          .sortBy('name'),
        database.tags
          .where('spaceId')
          .equals(spaceId)
          .filter((item) => item.deletedAt === undefined)
          .sortBy('name'),
      ]);
      return { folders, tags };
    },
    async saveFolder(name: string, id?: string) {
      const value = validateName(name);
      return database.transaction(
        'rw',
        database.spaces,
        database.folders,
        async () => {
          await requireSpace(database, spaceId);
          if (id)
            await requireOwnedRecord(database.folders, id, spaceId, 'folder');
          const duplicate = await database.folders
            .where('spaceId')
            .equals(spaceId)
            .filter(
              (folder) =>
                folder.deletedAt === undefined &&
                folder.id !== id &&
                folder.name.toLowerCase() === value.toLowerCase(),
            )
            .first();
          if (duplicate)
            throw new Error('A folder with this name already exists.');
          const now = Date.now();
          if (id) {
            await database.folders.update(id, { name: value, updatedAt: now });
            return id;
          }
          const folderId = crypto.randomUUID();
          await database.folders.add({
            id: folderId,
            spaceId,
            name: value,
            sortOrder: now,
            createdAt: now,
            updatedAt: now,
          });
          return folderId;
        },
      );
    },
    async saveTag(input: TagInput, id?: string) {
      const name = validateName(input.name);
      if (!/^#[0-9a-f]{6}$/i.test(input.color))
        throw new Error('Choose a valid tag color.');
      return database.transaction(
        'rw',
        database.spaces,
        database.tags,
        async () => {
          await requireSpace(database, spaceId);
          if (id) await requireOwnedRecord(database.tags, id, spaceId, 'tag');
          const duplicate = await database.tags
            .where('spaceId')
            .equals(spaceId)
            .filter(
              (tag) =>
                tag.deletedAt === undefined &&
                tag.id !== id &&
                tag.name.toLowerCase() === name.toLowerCase(),
            )
            .first();
          if (duplicate)
            throw new Error('A tag with this name already exists.');
          const now = Date.now();
          const values = {
            name,
            color: input.color.toLowerCase(),
            updatedAt: now,
          };
          if (id) {
            await database.tags.update(id, values);
            return id;
          }
          const tagId = crypto.randomUUID();
          await database.tags.add({
            ...values,
            id: tagId,
            spaceId,
            createdAt: now,
          });
          return tagId;
        },
      );
    },
    async removeFolder(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.folders,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(database.folders, id, spaceId, 'folder');
          const child = await database.folders
            .where('[spaceId+parentId]')
            .equals([spaceId, id])
            .filter((folder) => folder.deletedAt === undefined)
            .first();
          if (child)
            throw new Error(
              'Move or delete the subfolders before deleting this folder.',
            );
          const now = Date.now();
          await database.bookmarks
            .where('[spaceId+folderId]')
            .equals([spaceId, id])
            .modify({ folderId: undefined, updatedAt: now });
          await database.folders.update(id, { deletedAt: now, updatedAt: now });
        },
      );
    },
    async removeTag(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.tags,
        database.bookmarks,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(database.tags, id, spaceId, 'tag');
          const now = Date.now();
          await database.bookmarks
            .where('spaceId')
            .equals(spaceId)
            .filter((bookmark) => bookmark.tags.includes(id))
            .modify((bookmark) => {
              bookmark.tags = bookmark.tags.filter((tagId) => tagId !== id);
              bookmark.updatedAt = now;
            });
          await database.tags.update(id, { deletedAt: now, updatedAt: now });
        },
      );
    },
  };
}

export const personalOrganization = createOrganizationRepository('default');
