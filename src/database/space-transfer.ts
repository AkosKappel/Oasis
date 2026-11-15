import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import type { Bookmark, Folder, Tag } from '@/types/entities';
export interface TransferRequest {
  ids: string[];
  target: string;
  mode: 'copy' | 'move';
  seed: string;
}
export interface TransferSummary {
  bookmarks: number;
  newFolders: number;
  reusedFolders: number;
  newTags: number;
  reusedTags: number;
}
export interface TransferReview {
  request: TransferRequest;
  fingerprint: string;
  summary: TransferSummary;
}
export function createSpaceTransferRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  function validate(request: TransferRequest) {
    if (
      !request ||
      !Array.isArray(request.ids) ||
      request.ids.length < 1 ||
      request.ids.length > 1000 ||
      request.ids.some(
        (id) => typeof id !== 'string' || !id || id.length > 200,
      ) ||
      new Set(request.ids).size !== request.ids.length ||
      !['copy', 'move'].includes(request.mode) ||
      typeof request.target !== 'string' ||
      request.target === spaceId ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        request.seed,
      )
    )
      throw new Error(
        'Select 1 to 1,000 bookmarks and a different destination space.',
      );
  }
  async function build(request: TransferRequest) {
    validate(request);
    await requireSpace(database, spaceId);
    await requireSpace(database, request.target);
    const source = await Promise.all(
      [...request.ids]
        .sort()
        .map((id) =>
          requireOwnedRecord(database.bookmarks, id, spaceId, 'bookmark'),
        ),
    );
    const active = (record: { deletedAt?: number }) =>
      record.deletedAt === undefined;
    const [sourceFolders, sourceTags, targetFolders, targetTags] =
      await Promise.all([
        database.folders
          .where('spaceId')
          .equals(spaceId)
          .filter(active)
          .toArray(),
        database.tags.where('spaceId').equals(spaceId).filter(active).toArray(),
        database.folders
          .where('spaceId')
          .equals(request.target)
          .filter(active)
          .toArray(),
        database.tags
          .where('spaceId')
          .equals(request.target)
          .filter(active)
          .toArray(),
      ]);
    const folders = new Map(sourceFolders.map((item) => [item.id, item]));
    const tags = new Map(sourceTags.map((item) => [item.id, item]));
    const folderKey = (parent: string | undefined, name: string) =>
      JSON.stringify([parent ?? null, name.toLowerCase()]);
    const targetFolderNames = new Map(
      targetFolders.map((item) => [
        folderKey(item.parentId, item.name),
        item.id,
      ]),
    );
    const targetTagNames = new Map(
      targetTags.map((item) => [item.name.toLowerCase(), item.id]),
    );
    if (
      targetFolderNames.size !== targetFolders.length ||
      targetTagNames.size !== targetTags.length
    )
      throw new Error(
        'Rename conflicting folders or tags in the destination before transferring.',
      );
    const folderMap = new Map<string, string>(),
      tagMap = new Map<string, string>();
    const usedFolders = new Map<string, Folder>(),
      usedTags = new Map<string, Tag>();
    const newFolders: Folder[] = [],
      newTags: Tag[] = [],
      bookmarks: Bookmark[] = [];
    const now = Date.now();
    for (const bookmark of source) {
      const chain: Folder[] = [],
        visited = new Set<string>();
      let id = bookmark.folderId;
      while (id && !folderMap.has(id)) {
        if (visited.has(id))
          throw new Error('Repair a folder cycle before transferring.');
        visited.add(id);
        const folder = folders.get(id);
        if (!folder) throw new Error('A source folder is unavailable.');
        chain.push(folder);
        id = folder.parentId;
      }
      for (const folder of chain.reverse()) {
        usedFolders.set(folder.id, folder);
        const parentId = folder.parentId
          ? folderMap.get(folder.parentId)
          : undefined;
        const key = folderKey(parentId, folder.name);
        let target = targetFolderNames.get(key);
        if (!target) {
          target = `${request.seed}:f${newFolders.length}`;
          newFolders.push({
            ...folder,
            id: target,
            spaceId: request.target,
            parentId,
            createdAt: now,
            updatedAt: now,
            sortOrder: now + newFolders.length,
          });
          targetFolderNames.set(key, target);
        }
        folderMap.set(folder.id, target);
      }
      const mappedTags: string[] = [];
      for (const id of bookmark.tags) {
        if (!tagMap.has(id)) {
          const tag = tags.get(id);
          if (!tag) throw new Error('A source tag is unavailable.');
          usedTags.set(id, tag);
          let target = targetTagNames.get(tag.name.toLowerCase());
          if (!target) {
            target = `${request.seed}:t${newTags.length}`;
            newTags.push({
              ...tag,
              id: target,
              spaceId: request.target,
              createdAt: now,
              updatedAt: now,
            });
            targetTagNames.set(tag.name.toLowerCase(), target);
          }
          tagMap.set(id, target);
        }
        mappedTags.push(tagMap.get(id)!);
      }
      bookmarks.push({
        ...bookmark,
        id: `${request.seed}:b${bookmarks.length}`,
        spaceId: request.target,
        folderId: bookmark.folderId
          ? folderMap.get(bookmark.folderId)
          : undefined,
        tags: mappedTags,
        openCount: 0,
        lastOpenedAt: undefined,
        sortOrder: now + bookmarks.length,
        createdAt: now,
        updatedAt: now,
      });
    }
    const sorted = <T extends { id: string }>(items: T[]) =>
      [...items].sort((a, b) => a.id.localeCompare(b.id));
    const fingerprint = JSON.stringify({
      spaceId,
      request: {
        ids: [...request.ids].sort(),
        target: request.target,
        mode: request.mode,
      },
      source,
      sourceFolders: sorted([...usedFolders.values()]),
      sourceTags: sorted([...usedTags.values()]),
      targetFolders: sorted(targetFolders),
      targetTags: sorted(targetTags),
    });
    const summary = {
      bookmarks: source.length,
      newFolders: newFolders.length,
      reusedFolders: folderMap.size - newFolders.length,
      newTags: newTags.length,
      reusedTags: tagMap.size - newTags.length,
    };
    return { source, newFolders, newTags, bookmarks, fingerprint, summary };
  }
  const tables = [
    database.spaces,
    database.bookmarks,
    database.folders,
    database.tags,
  ];
  return {
    async preview(
      ids: string[],
      target: string,
      mode: 'copy' | 'move',
    ): Promise<TransferReview> {
      const request = { ids, target, mode, seed: crypto.randomUUID() };
      validate(request);
      request.ids = [...ids];
      return database.transaction('r', tables, async () => {
        const plan = await build(request);
        return {
          request,
          fingerprint: plan.fingerprint,
          summary: plan.summary,
        };
      });
    },
    async apply(review: TransferReview): Promise<TransferSummary> {
      return database.transaction('rw', tables, async () => {
        const plan = await build(review.request);
        if (plan.fingerprint !== review.fingerprint)
          throw new Error(
            'The library changed. Review the transfer again before saving.',
          );
        await database.folders.bulkAdd(plan.newFolders);
        await database.tags.bulkAdd(plan.newTags);
        await database.bookmarks.bulkAdd(plan.bookmarks);
        if (review.request.mode === 'move') {
          const now = Date.now();
          await database.bookmarks.bulkPut(
            plan.source.map((record) => ({
              ...record,
              deletedAt: now,
              updatedAt: now,
            })),
          );
        }
        return plan.summary;
      });
    },
  };
}
