import {
  createDashboardLayoutRepository,
  defaultDashboardItems,
} from './dashboard-layout';
import { createLibraryPreferencesRepository } from './library-preferences';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createAppearanceRepository } from './appearance';
it('upgrades v14 without enabling Home bookmark sections or changing saved preferences', async () => {
  const name = 'dashboard-migration-test';
  const legacy = new Dexie(name);
  legacy.version(14).stores({
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
  });
  await legacy.open();
  await legacy
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  const preference = {
    id: 'default:appearance',
    spaceId: 'default',
    theme: 'dark',
    accent: 'ocean',
    clock: '24',
    showDate: false,
    showFavorites: true,
    linksSide: 'right',
    linksPinned: false,
    createdAt: 1,
    updatedAt: 1,
  };
  await legacy.table('preferences').add(preference);
  await legacy.table('libraryPreferences').add({
    id: 'default:library',
    spaceId: 'default',
    view: 'list',
    sort: 'oldest',
    trackOpens: false,
    createdAt: 1,
    updatedAt: 1,
  });
  legacy.close();
  const database = new OasisDatabase(name);
  try {
    await database.open();
    expect(database.verno).toBe(17);
    expect(
      await createLibraryPreferencesRepository('default', database).get(),
    ).toEqual({ view: 'list', sort: 'oldest', trackOpens: false });
    expect(await database.dashboardLayouts.count()).toBe(0);
    expect(
      (await createDashboardLayoutRepository('default', database).get()).items,
    ).toEqual(defaultDashboardItems());
    expect(await database.preferences.get(preference.id)).toEqual(preference);
    const appearance = await createAppearanceRepository(
      'default',
      database,
    ).get();
    expect(appearance.showRecentBookmarks ?? false).toBe(false);
    expect(appearance.showFrequentBookmarks ?? false).toBe(false);
  } finally {
    await database.delete();
  }
});
