import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { OasisDatabase } from './schema';
const oldStores = {
  spaces: 'id, name, updatedAt',
  bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
  folders: 'id, spaceId, [spaceId+parentId], updatedAt',
  tags: 'id, spaceId, [spaceId+name], updatedAt',
  preferences: 'id, spaceId',
  albums: 'id, spaceId',
  albumImages: 'id, spaceId, [spaceId+albumId]',
  backgrounds: 'id, spaceId',
  quoteCollections: 'id, spaceId',
  quotes: 'id, spaceId, [spaceId+collectionId]',
  quoteSettings: 'id, spaceId',
  libraryPreferences: 'id, spaceId',
  dailyFocus: 'id, spaceId, [spaceId+day]',
  homeWidgets: 'id, spaceId',
  focusSessions: 'id, spaceId',
  weatherSettings: 'id, spaceId',
  dashboardLayouts: 'id, spaceId',
  contentFeedback: 'id, spaceId, [spaceId+kind]',
  savedSearches: 'id, spaceId',
};
it('upgrades v19 without changing existing widgets or enabling notes', async () => {
  const name = 'note-widget-migration';
  const old = new Dexie(name);
  old.version(19).stores(oldStores);
  await old.open();
  await old
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  const clock = {
    id: 'clock',
    spaceId: 'default',
    kind: 'clock',
    label: 'Tokyo',
    timeZone: 'Asia/Tokyo',
    visible: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await old.table('homeWidgets').add(clock);
  old.close();
  const database = new OasisDatabase(name);
  try {
    await database.open();
    expect(database.verno).toBe(21);
    expect(await database.homeWidgets.toArray()).toEqual([clock]);
  } finally {
    await database.delete();
  }
});
it('upgrades v20 preserving note text and visibility with an empty task table', async () => {
  const name = 'task-widget-migration';
  const old = new Dexie(name);
  old.version(20).stores(oldStores);
  await old.open();
  await old
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  const note = {
    id: 'note',
    spaceId: 'default',
    kind: 'note',
    label: 'Ideas',
    text: 'Keep this text.\nSecond line.',
    visible: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await old.table('homeWidgets').add(note);
  old.close();
  const database = new OasisDatabase(name);
  try {
    await database.open();
    expect(database.verno).toBe(21);
    expect(await database.homeWidgets.toArray()).toEqual([note]);
    expect(await database.widgetTasks.count()).toBe(0);
  } finally {
    await database.delete();
  }
});
