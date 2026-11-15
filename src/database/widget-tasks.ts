import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface WidgetTask extends RecordMetadata {
  spaceId: string;
  widgetId: string;
  text: string;
  completed: boolean;
}
export function taskText(value: string) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200)
    throw new Error('Enter a task of up to 200 characters.');
  return value.trim().replace(/\s+/g, ' ');
}
export function createWidgetTaskRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const tables = [database.spaces, database.homeWidgets, database.widgetTasks];
  async function parent(widgetId: string) {
    await requireSpace(database, spaceId);
    const widget = await requireOwnedRecord(
      database.homeWidgets,
      widgetId,
      spaceId,
      'task list',
    );
    if (widget.kind !== 'tasks') throw new Error('Choose a task-list widget.');
    return widget;
  }
  async function current(id: string) {
    const task = await requireOwnedRecord(
      database.widgetTasks,
      id,
      spaceId,
      'task',
    );
    await parent(task.widgetId);
    return task;
  }
  const active = (widgetId: string) =>
    database.widgetTasks
      .where('[spaceId+widgetId]')
      .equals([spaceId, widgetId])
      .filter((task) => task.deletedAt === undefined);
  return {
    list(widgetId: string) {
      return database.transaction('r', tables, async () => {
        await parent(widgetId);
        return active(widgetId).sortBy('createdAt');
      });
    },
    save(
      widgetId: string,
      input: string,
      id?: string,
      expectedUpdatedAt?: number,
    ) {
      const text = taskText(input);
      return database.transaction('rw', tables, async () => {
        await parent(widgetId);
        const previous = id ? await current(id) : undefined;
        if (previous && previous.widgetId !== widgetId)
          throw new Error('This task belongs to another list.');
        if (previous && previous.updatedAt !== expectedUpdatedAt)
          throw new Error(
            'This task changed. Reopen it before saving. Your draft is kept.',
          );
        if (!previous && (await active(widgetId).count()) >= 50)
          throw new Error(
            'Keep up to 50 tasks per list. Remove completed tasks before adding more.',
          );
        const now = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1),
          task: WidgetTask = {
            id: id ?? crypto.randomUUID(),
            spaceId,
            widgetId,
            text,
            completed: previous?.completed ?? false,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          };
        await database.widgetTasks.put(task);
        return task.id;
      });
    },
    async complete(id: string, completed: boolean) {
      if (typeof completed !== 'boolean')
        throw new Error('Choose a valid task state.');
      return database.transaction('rw', tables, async () => {
        const task = await current(id);
        const updatedAt = Math.max(Date.now(), task.updatedAt + 1);
        await database.widgetTasks.update(id, { completed, updatedAt });
        return updatedAt;
      });
    },
    async remove(id: string, expectedUpdatedAt: number) {
      await database.transaction('rw', tables, async () => {
        const task = await current(id);
        if (task.updatedAt !== expectedUpdatedAt)
          throw new Error('This task changed. Review it before removing.');
        const now = Math.max(Date.now(), task.updatedAt + 1);
        await database.widgetTasks.update(id, {
          deletedAt: now,
          updatedAt: now,
        });
      });
    },
    async clearCompleted(widgetId: string) {
      return database.transaction('rw', tables, async () => {
        await parent(widgetId);
        const tasks = await active(widgetId)
          .and((task) => task.completed)
          .toArray();
        await database.widgetTasks.bulkPut(
          tasks.map((task) => {
            const now = Math.max(Date.now(), task.updatedAt + 1);
            return { ...task, deletedAt: now, updatedAt: now };
          }),
        );
        return tasks.map((task) => task.id);
      });
    },
  };
}
export function taskListText(label: string, tasks: WidgetTask[]) {
  return `${label}\n\n${tasks
    .filter((task) => task.deletedAt === undefined)
    .map((task) => `[${task.completed ? 'x' : ' '}] ${task.text}`)
    .join('\n')}\n`;
}
