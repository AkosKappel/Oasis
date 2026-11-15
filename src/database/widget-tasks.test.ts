import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createWidgetTaskRepository,
  taskListText,
  taskText,
} from './widget-tasks';
import { createHomeWidgetRepository } from './home-widgets';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('widget-tasks-test');
afterEach(() => database.delete());
async function seed() {
  await database.open();
  const widgets = createHomeWidgetRepository('default', database);
  const id = await widgets.save({
    kind: 'tasks',
    label: 'Reading',
    visible: false,
  });
  return {
    widgets,
    id,
    tasks: createWidgetTaskRepository('default', database),
  };
}
it('validates tasks, preserves completion during edits and rejects stale writes', async () => {
  const { id, tasks } = await seed();
  expect(taskText(' Read\n a chapter ')).toBe('Read a chapter');
  expect(() => taskText(' ')).toThrow();
  expect(() => taskText('x'.repeat(201))).toThrow();
  const taskId = await tasks.save(id, 'Read a chapter');
  const opening = (await tasks.list(id))[0]!;
  await tasks.complete(taskId, true);
  await expect(
    tasks.save(id, 'Stale edit', taskId, opening.updatedAt),
  ).rejects.toThrow('changed');
  await expect(tasks.remove(taskId, opening.updatedAt)).rejects.toThrow(
    'changed',
  );
  const current = (await tasks.list(id))[0]!;
  await tasks.save(id, 'Read two chapters', taskId, current.updatedAt);
  const updated = (await tasks.list(id))[0]!;
  expect(updated.completed).toBe(true);
  expect(taskListText('Reading', [updated])).toBe(
    'Reading\n\n[x] Read two chapters\n',
  );
  await tasks.complete(taskId, false);
  expect((await tasks.list(id))[0]?.text).toBe('Read two chapters');
});
it('protects foreign lists, task membership and deleted parents and cascades removal', async () => {
  const { widgets, id, tasks } = await seed();
  const second = await widgets.save({
    kind: 'tasks',
    label: 'Other list',
    visible: false,
  });
  const clock = await widgets.save({
    kind: 'clock',
    label: 'UTC',
    timeZone: 'UTC',
    visible: false,
  });
  const taskId = await tasks.save(id, 'Read');
  const current = (await tasks.list(id))[0]!;
  await expect(
    tasks.save(second, 'Move accidentally', taskId, current.updatedAt),
  ).rejects.toThrow('another list');
  await expect(tasks.save(clock, 'Wrong kind')).rejects.toThrow('task-list');
  const other = await createSpaceRepository(database).save('Other');
  await expect(
    createWidgetTaskRepository(other, database).complete(taskId, true),
  ).rejects.toThrow();
  await expect(
    createWidgetTaskRepository(other, database).list(id),
  ).rejects.toThrow();
  const parent = (await widgets.list()).find((widget) => widget.id === id)!;
  const fail = () => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  };
  database.homeWidgets.hook('updating', fail);
  try {
    await expect(widgets.remove(id, parent.updatedAt)).rejects.toThrow(
      'Storage full',
    );
  } finally {
    database.homeWidgets.hook('updating').unsubscribe(fail);
  }
  expect((await database.homeWidgets.get(id))?.deletedAt).toBeUndefined();
  expect((await tasks.list(id)).map((task) => task.id)).toEqual([taskId]);
  await widgets.remove(id, parent.updatedAt);
  expect((await database.widgetTasks.get(taskId))?.deletedAt).toBeTypeOf(
    'number',
  );
  await expect(tasks.save(id, 'No revival')).rejects.toThrow();
  await expect(tasks.complete(taskId, true)).rejects.toThrow();
});
it('bounds active tasks and clears only completed tasks in the requested owned list', async () => {
  const { widgets, id, tasks } = await seed();
  const second = await widgets.save({
    kind: 'tasks',
    label: 'Another list',
    visible: false,
  });
  await database.widgetTasks.bulkAdd(
    Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      widgetId: id,
      spaceId: 'default',
      text: `Task ${i}`,
      completed: i === 0,
      createdAt: 1,
      updatedAt: 1,
    })),
  );
  const kept = await tasks.save(second, 'Keep completed elsewhere');
  await tasks.complete(kept, true);
  await expect(tasks.save(id, 'Too many')).rejects.toThrow('50');
  await tasks.clearCompleted(id);
  expect(await tasks.list(id)).toHaveLength(49);
  expect((await database.widgetTasks.get('0'))?.deletedAt).toBeTypeOf('number');
  expect((await tasks.list(second))[0]?.completed).toBe(true);
  await tasks.save(id, 'Room again');
  expect(await tasks.list(id)).toHaveLength(50);
});

it('deletes task content with its space while keeping other spaces intact', async () => {
  const { id, tasks } = await seed();
  await tasks.save(id, 'Keep in Personal');
  const other = await createSpaceRepository(database).save('Work');
  const widgets = createHomeWidgetRepository(other, database);
  const list = await widgets.save({
    kind: 'tasks',
    label: 'Work tasks',
    visible: false,
  });
  const otherTasks = createWidgetTaskRepository(other, database);
  const task = await otherTasks.save(list, 'Remove with Work');
  await createSpaceRepository(database).remove(other);
  expect((await database.widgetTasks.get(task))?.deletedAt).toBeTypeOf(
    'number',
  );
  expect(await tasks.list(id)).toHaveLength(1);
  await expect(otherTasks.list(list)).rejects.toThrow();
});
