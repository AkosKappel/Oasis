import { afterEach, expect, it } from 'vitest';
import { OasisDatabase, SCHEMA_VERSION } from './schema';
const database = new OasisDatabase('oasis-test');
afterEach(async () => {
  await database.delete();
});
it('creates the default space once and preserves it when reopened', async () => {
  await database.open();
  expect(await database.spaces.toArray()).toEqual([
    expect.objectContaining({ id: 'default', name: 'Personal' }),
  ]);
  await database.spaces.update('default', { name: 'Work' });
  database.close();
  await database.open();
  expect(await database.spaces.count()).toBe(1);
  expect((await database.spaces.get('default'))?.name).toBe('Work');
});

it('upgrades a v1 library without changing its bookmarks', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(1).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
  });
  await legacy.open();
  const bookmark = {
    id: 'saved',
    spaceId: 'default',
    title: 'Keep me',
    url: 'https://example.com',
    tags: [],
    isFavorite: true,
    isPinned: false,
    sortOrder: 1,
    openCount: 0,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('bookmarks'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('bookmarks').add(bookmark);
    },
  );
  legacy.close();
  await database.open();
  expect(database.verno).toBe(SCHEMA_VERSION);
  expect(await database.bookmarks.get('saved')).toEqual(bookmark);
  expect(await database.preferences.count()).toBe(0);
});

it('upgrades v2 preferences while adding empty media tables', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(2).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
    preferences: 'id, spaceId',
  });
  await legacy.open();
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'ocean',
    clock: '24',
    showDate: true,
    showFavorites: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual({
    ...preference,
    showFavorites: false,
    linksSide: 'left',
    linksPinned: false,
  });
  expect(await database.albums.count()).toBe(0);
  expect(await database.albumImages.count()).toBe(0);
});

it('upgrades v3 media without changing stored images', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(3).stores({
    spaces: 'id, name, updatedAt',
    bookmarks: 'id, spaceId, [spaceId+folderId], *tags, updatedAt',
    folders: 'id, spaceId, [spaceId+parentId], updatedAt',
    tags: 'id, spaceId, [spaceId+name], updatedAt',
    preferences: 'id, spaceId',
    albums: 'id, spaceId',
    albumImages: 'id, spaceId, [spaceId+albumId]',
    backgrounds: 'id, spaceId',
  });
  await legacy.open();
  const image = {
    id: 'image',
    spaceId: 'default',
    albumId: 'album',
    name: 'Image',
    dataUrl: 'data:image/jpeg;base64,/9j/',
    width: 1,
    height: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('albums'),
    legacy.table('albumImages'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('albums').add({
        id: 'album',
        spaceId: 'default',
        name: 'Nature',
        createdAt: 1,
        updatedAt: 1,
      });
      await legacy.table('albumImages').add(image);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.albumImages.get('image')).toEqual(image);
  expect(await database.quotes.count()).toBe(0);
});

it('upgrades v4 quote collections while adding independent library preferences', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(4).stores({
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
  });
  await legacy.open();
  const quote = {
    id: 'quote',
    spaceId: 'default',
    collectionId: 'collection',
    text: 'Keep it simple.',
    author: '',
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('quoteCollections'),
    legacy.table('quotes'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('quoteCollections').add({
        id: 'collection',
        spaceId: 'default',
        name: 'Reminders',
        createdAt: 1,
        updatedAt: 1,
      });
      await legacy.table('quotes').add(quote);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.quotes.get('quote')).toEqual(quote);
  expect(await database.libraryPreferences.count()).toBe(0);
});

it('migrates the shortcut row to opt-in without changing other appearance preferences', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(5).stores({
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
  });
  await legacy.open();
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'plum',
    clock: '24',
    showDate: false,
    showFavorites: true,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual({
    ...preference,
    showFavorites: false,
    linksSide: 'left',
    linksPinned: false,
  });
});

it('upgrades v6 appearance records for optional colors without losing saved preferences', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(6).stores({
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
  });
  await legacy.open();
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'light',
    accent: 'ocean',
    clock: '12',
    showDate: true,
    showFavorites: true,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual({
    ...preference,
    linksSide: 'left',
    linksPinned: false,
  });
});

it('adds Links placement defaults to v7 appearance records', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(7).stores({
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
  });
  await legacy.open();
  const record = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'ocean',
    clock: '24',
    showDate: true,
    showFavorites: false,
    primaryColor: '#456789',
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(record);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(record.id)).toEqual({
    ...record,
    linksSide: 'left',
    linksPinned: false,
  });
});

it('upgrades v8 without replacing appearance or existing records', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy
    .version(8)
    .stores({ spaces: 'id, name, updatedAt', preferences: 'id, spaceId' });
  await legacy.open();
  const space = { id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 };
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    linksSide: 'right',
    linksPinned: true,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy.table('spaces').add(space);
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual(preference);
  expect(await database.spaces.get('default')).toEqual({
    ...space,
    setupComplete: true,
  });
  expect(await database.dailyFocus.count()).toBe(0);
});

it('upgrades v9 daily focus without losing goals', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy.version(9).stores({
    spaces: 'id, name, updatedAt',
    dailyFocus: 'id, spaceId, [spaceId+day]',
  });
  await legacy.open();
  const goal = {
    id: 'goal',
    spaceId: 'default',
    day: '2026-11-14',
    title: 'Keep me',
    completed: true,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('dailyFocus'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('dailyFocus').add(goal);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.dailyFocus.get('goal')).toEqual(goal);
  expect(await database.homeWidgets.count()).toBe(0);
});

it('preserves v10 widgets when adding focus sessions', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy
    .version(10)
    .stores({ spaces: 'id, name, updatedAt', homeWidgets: 'id, spaceId' });
  await legacy.open();
  const widget = {
    id: 'clock',
    spaceId: 'default',
    kind: 'clock',
    label: 'Tokyo',
    timeZone: 'Asia/Tokyo',
    visible: true,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('homeWidgets'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('homeWidgets').add(widget);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.homeWidgets.get('clock')).toEqual(widget);
  expect(await database.focusSessions.count()).toBe(0);
});

it('keeps v11 sessions while adding optional weather storage', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy
    .version(11)
    .stores({ spaces: 'id, name, updatedAt', focusSessions: 'id, spaceId' });
  await legacy.open();
  const session = {
    id: 'default:focus-session',
    spaceId: 'default',
    state: 'paused',
    endsAt: 1000,
    remaining: 500,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('focusSessions'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('focusSessions').add(session);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.focusSessions.get(session.id)).toEqual(session);
  expect(await database.weatherSettings.count()).toBe(0);
});

it('preserves v12 appearance with local bookmark search as the legacy default', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy
    .version(12)
    .stores({ spaces: 'id, name, updatedAt', preferences: 'id, spaceId' });
  await legacy.open();
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'forest',
    clock: '24',
    showDate: true,
    showFavorites: false,
    linksSide: 'left',
    linksPinned: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.transaction(
    'rw',
    legacy.table('spaces'),
    legacy.table('preferences'),
    async () => {
      await legacy
        .table('spaces')
        .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
      await legacy.table('preferences').add(preference);
    },
  );
  legacy.close();
  await database.open();
  expect(await database.preferences.get(preference.id)).toEqual(preference);
});

it('upgrades v23 timers without opting existing sessions into cycles', async () => {
  const { default: Dexie } = await import('dexie');
  const legacy = new Dexie('oasis-test');
  legacy
    .version(23)
    .stores({ spaces: 'id, name, updatedAt', focusSessions: 'id, spaceId' });
  await legacy.open();
  const session = {
    id: 'default:focus-session',
    spaceId: 'default',
    state: 'paused',
    endsAt: 1000,
    remaining: 500,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  await legacy.table('focusSessions').add(session);
  legacy.close();
  await database.open();
  expect(database.verno).toBe(SCHEMA_VERSION);
  expect(await database.focusSessions.get(session.id)).toEqual(session);
});
