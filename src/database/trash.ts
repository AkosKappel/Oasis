import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import { validateWidget } from './home-widgets';
export type TrashKind = 'bookmark' | 'widget' | 'task';
export interface TrashItem {
  id: string;
  kind: TrashKind;
  label: string;
  deletedAt: number;
}
export function createTrashRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const tables = [
    database.spaces,
    database.bookmarks,
    database.folders,
    database.tags,
    database.homeWidgets,
    database.widgetTasks,
  ];
  return {
    list() {
      return database.transaction('r', tables, async () => {
        await requireSpace(database, spaceId);
        const [bookmarks, widgets, tasks] = await Promise.all([
          database.bookmarks.where('spaceId').equals(spaceId).toArray(),
          database.homeWidgets.where('spaceId').equals(spaceId).toArray(),
          database.widgetTasks.where('spaceId').equals(spaceId).toArray(),
        ]);
        return [
          ...bookmarks
            .filter((x) => x.deletedAt !== undefined)
            .map((x) => ({
              id: x.id,
              kind: 'bookmark' as const,
              label: x.title,
              deletedAt: x.deletedAt!,
            })),
          ...widgets
            .filter((x) => x.deletedAt !== undefined)
            .map((x) => ({
              id: x.id,
              kind: 'widget' as const,
              label: x.label,
              deletedAt: x.deletedAt!,
            })),
          ...tasks
            .filter((x) => x.deletedAt !== undefined)
            .map((x) => ({
              id: x.id,
              kind: 'task' as const,
              label: x.text,
              deletedAt: x.deletedAt!,
            })),
        ].sort((a, b) => b.deletedAt - a.deletedAt || a.id.localeCompare(b.id));
      });
    },
    restore(items: Pick<TrashItem, 'id' | 'kind'>[]) {
      if (!items.length || items.length > 1000)
        throw new Error('Choose up to 1,000 items to restore.');
      return database.transaction('rw', tables, async () => {
        await requireSpace(database, spaceId);
        for (const item of items) {
          const table =
            item.kind === 'bookmark'
              ? database.bookmarks
              : item.kind === 'widget'
                ? database.homeWidgets
                : item.kind === 'task'
                  ? database.widgetTasks
                  : undefined;
          if (!table) throw new Error('Choose a valid Trash item.');
          const row = await table.get(item.id);
          if (!row || row.spaceId !== spaceId || row.deletedAt === undefined)
            throw new Error('This item is no longer in this space’s Trash.');
          const now = Math.max(Date.now(), row.updatedAt + 1);
          if (item.kind === 'bookmark') {
            const bookmark = await database.bookmarks.get(item.id);
            if (!bookmark) throw new Error('Bookmark unavailable.');
            const folder = bookmark.folderId
              ? await database.folders.get(bookmark.folderId)
              : undefined;
            const tags = await database.tags.bulkGet(bookmark.tags);
            await database.bookmarks.put({
              ...bookmark,
              folderId:
                folder?.spaceId === spaceId && folder.deletedAt === undefined
                  ? folder.id
                  : undefined,
              tags: tags
                .filter(
                  (x) => x?.spaceId === spaceId && x.deletedAt === undefined,
                )
                .map((x) => x!.id),
              deletedAt: undefined,
              updatedAt: now,
            });
          } else if (item.kind === 'widget') {
            const widget = await database.homeWidgets.get(item.id);
            if (!widget) throw new Error('Widget unavailable.');
            validateWidget(widget);
            const count = await database.homeWidgets
              .where('spaceId')
              .equals(spaceId)
              .filter(
                (x) => x.kind === widget.kind && x.deletedAt === undefined,
              )
              .count();
            if (count >= 3)
              throw new Error(
                'Keep up to three widgets of each type. Remove one before restoring.',
              );
            await database.homeWidgets.put({
              ...widget,
              deletedAt: undefined,
              deletionBatch: undefined,
              updatedAt: now,
            });
            if (widget.kind === 'tasks' && widget.deletionBatch)
              await database.widgetTasks
                .where('[spaceId+widgetId]')
                .equals([spaceId, widget.id])
                .filter(
                  (x) =>
                    x.deletedAt !== undefined &&
                    x.deletionBatch === widget.deletionBatch,
                )
                .modify((x) => {
                  delete x.deletedAt;
                  delete x.deletionBatch;
                  x.updatedAt = Math.max(now, x.updatedAt + 1);
                });
          } else {
            const task = await database.widgetTasks.get(item.id);
            if (!task) throw new Error('Task unavailable.');
            const parent = await database.homeWidgets.get(task.widgetId);
            if (
              !parent ||
              parent.spaceId !== spaceId ||
              parent.deletedAt !== undefined ||
              parent.kind !== 'tasks'
            )
              throw new Error('Restore this task’s list first.');
            const count = await database.widgetTasks
              .where('[spaceId+widgetId]')
              .equals([spaceId, task.widgetId])
              .filter((x) => x.deletedAt === undefined)
              .count();
            if (count >= 50) throw new Error('Keep up to 50 tasks per list.');
            await database.widgetTasks.put({
              ...task,
              deletedAt: undefined,
              deletionBatch: undefined,
              updatedAt: now,
            });
          }
        }
      });
    },
  };
}
