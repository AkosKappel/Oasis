import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { OasisDatabase, SCHEMA_VERSION } from './schema';
import {
  createAppearanceRepository,
  defaultAppearance,
  validateAppearance,
} from './appearance';

it('persists section choices and rejects invalid flags', async () => {
  const database = new OasisDatabase('links-settings');
  try {
    const repository = createAppearanceRepository('default', database);
    await repository.save({
      ...defaultAppearance,
      showLinksFavorites: false,
      showLinksRecent: false,
      showLinksFrequent: true,
    });
    expect(await repository.get()).toMatchObject({
      showLinksFavorites: false,
      showLinksRecent: false,
      showLinksFrequent: true,
    });
    for (const field of [
      'showLinksFavorites',
      'showLinksRecent',
      'showLinksFrequent',
    ])
      expect(() =>
        validateAppearance({ ...defaultAppearance, [field]: 'yes' }),
      ).toThrow('appearance');
  } finally {
    await database.delete();
  }
});
it('upgrades v24 while preserving preferences and keeping section defaults independent of tracking', async () => {
  const name = 'links-settings-migration';
  const template = new OasisDatabase(name);
  const stores = Object.fromEntries(
    template.tables.map((table) => [
      table.name,
      [
        table.schema.primKey.src,
        ...table.schema.indexes.map((index) => index.src),
      ].join(', '),
    ]),
  );
  template.close();
  const legacy = new Dexie(name);
  legacy.version(24).stores(stores);
  await legacy.open();
  const saved = {
    ...defaultAppearance,
    id: 'default:appearance',
    spaceId: 'default',
    createdAt: 1,
    updatedAt: 1,
    linksPinned: true,
  };
  await legacy
    .table('spaces')
    .add({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  await legacy.table('preferences').add(saved);
  legacy.close();
  const database = new OasisDatabase(name);
  try {
    await database.open();
    expect(database.verno).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(25);
    expect(await database.preferences.get(saved.id)).toEqual(saved);
    const appearance = await createAppearanceRepository(
      'default',
      database,
    ).get();
    expect(appearance.linksPinned).toBe(true);
    expect(appearance.showLinksRecent ?? true).toBe(true);
    expect(appearance.showLinksFrequent ?? true).toBe(true);
    expect(await database.libraryPreferences.count()).toBe(0);
  } finally {
    await database.delete();
  }
});
