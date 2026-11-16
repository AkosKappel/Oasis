import { afterEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { OasisDatabase, SCHEMA_VERSION } from './schema';
import { createTrashRepository } from './trash';
import { createHomeWidgetRepository } from './home-widgets';
import { createWidgetTaskRepository } from './widget-tasks';
import { createOrganizationRepository } from './organization';
import { createBookmarkRepository } from './bookmarks';
const database = new OasisDatabase('trash-test');
afterEach(() => database.delete());
it('restores a list with only tasks removed by that deletion, and rejects foreign restores', async () => {
  await database.open();
  const widgets = createHomeWidgetRepository('default', database),
    tasks = createWidgetTaskRepository('default', database),
    trash = createTrashRepository('default', database);
  const list = await widgets.save({
    kind: 'tasks',
    label: 'Today',
    visible: true,
  });
  const old = await tasks.save(list, 'Already removed');
  const active = await tasks.save(list, 'Keep with list');
  await tasks.remove(old, (await database.widgetTasks.get(old))!.updatedAt);
  await widgets.remove(list, (await database.homeWidgets.get(list))!.updatedAt);
  await expect(trash.restore([{ id: active, kind: 'task' }])).rejects.toThrow(
    'list first',
  );
  await trash.restore([{ id: list, kind: 'widget' }]);
  expect((await tasks.list(list)).map((x) => x.id)).toEqual([active]);
  expect((await trash.list()).map((x) => x.id)).toEqual([old]);
  await database.spaces.add({
    id: 'other',
    name: 'Other',
    createdAt: 1,
    updatedAt: 1,
  });
  await expect(
    createTrashRepository('other', database).restore([
      { id: old, kind: 'task' },
    ]),
  ).rejects.toThrow();
  await trash.restore([{ id: old, kind: 'task' }]);
  expect(await tasks.list(list)).toHaveLength(2);
});
it('restores bookmarks without reviving deleted organization and rolls back mixed invalid batches', async () => {
  await database.open();
  const bookmarks = createBookmarkRepository('default', database),
    trash = createTrashRepository('default', database);
  const org = createOrganizationRepository('default', database);
  const folder = await org.saveFolder('Old folder');
  const tag = await org.saveTag({ name: 'Old tag', color: '#336699' });
  const id = await bookmarks.save({
    folderId: folder,
    title: 'Guide',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
    tags: [tag],
  });
  await bookmarks.remove(id);
  await database.folders.update(folder, { deletedAt: Date.now() });
  await database.tags.update(tag, { deletedAt: Date.now() });
  await expect(
    trash.restore([
      { id, kind: 'bookmark' },
      { id: 'missing', kind: 'task' },
    ]),
  ).rejects.toThrow();
  expect((await database.bookmarks.get(id))!.deletedAt).toBeDefined();
  await trash.restore([{ id, kind: 'bookmark' }]);
  expect((await database.bookmarks.get(id))!.folderId).toBeUndefined();
  expect((await database.bookmarks.get(id))!.tags).toEqual([]);
  expect((await bookmarks.list()).map((x) => x.id)).toContain(id);
});
it('upgrades old tombstones without guessing cascade membership', async () => {
  const old = new Dexie('trash-test');
  old.version(21).stores({
    spaces: 'id, name, updatedAt',
    homeWidgets: 'id, spaceId',
    widgetTasks: 'id, spaceId, [spaceId+widgetId]',
  });
  await old.open();
  await old
    .table('spaces')
    .put({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  await old.table('homeWidgets').put({
    id: 'list',
    spaceId: 'default',
    kind: 'tasks',
    label: 'Legacy',
    visible: false,
    createdAt: 1,
    updatedAt: 2,
    deletedAt: 2,
  });
  await old.table('widgetTasks').put({
    id: 'task',
    spaceId: 'default',
    widgetId: 'list',
    text: 'Legacy task',
    completed: false,
    createdAt: 1,
    updatedAt: 2,
    deletedAt: 2,
  });
  old.close();
  await database.open();
  expect(database.verno).toBe(SCHEMA_VERSION);
  await createTrashRepository('default', database).restore([
    { id: 'list', kind: 'widget' },
  ]);
  expect((await database.widgetTasks.get('task'))!.deletedAt).toBe(2);
});
