import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createSpaceBackupRepository,
  parseSpaceBackup,
  serializeSpaceBackup,
  validateSpaceBackup,
  SPACE_TABLES,
} from './space-backup';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { createAlbumRepository } from './albums';
import { createQuoteRepository } from './quotes';
import { createHomeWidgetRepository } from './home-widgets';
import { createWidgetTaskRepository } from './widget-tasks';
import { createAppearanceRepository, defaultAppearance } from './appearance';
import { createSavedSearchRepository } from './saved-searches';
import { createContentFeedbackRepository } from './content-feedback';
import { createWeatherRepository } from './weather';
import { createLibraryPreferencesRepository } from './library-preferences';
import { createFocusSessionRepository } from './focus-session';
import { createDesktopRepository } from './desktop';
import { createPageTextRepository } from './page-texts';
import { createContentProviderRepository } from './content-providers';
const database = new OasisDatabase('complete-space-backup');
afterEach(() => database.delete());
async function seed() {
  await database.open();
  const organization = createOrganizationRepository('default', database);
  const folder = await organization.saveFolder('Reading');
  const tag = await organization.saveTag({
    name: 'Reference',
    color: '#336699',
  });
  const bookmark = await createBookmarkRepository('default', database).save({
    title: 'Guide',
    url: 'https://example.com',
    description: 'Read later',
    isFavorite: true,
    folderId: folder,
    tags: [tag],
  });
  const albums = createAlbumRepository('default', database);
  const album = await albums.saveAlbum('Personal');
  await albums.addImages(album, [
    {
      name: 'Image',
      dataUrl: 'data:image/jpeg;base64,/9j/',
      width: 1,
      height: 1,
    },
  ]);
  const image = (await albums.export()).images[0]!;
  await albums.setBackground(album, image.id);
  const quotes = createQuoteRepository('default', database);
  const collection = await quotes.saveCollection('Reminders');
  const quote = await quotes.saveQuote(collection, {
    text: 'Keep going.',
    author: 'Personal note',
  });
  await quotes.setDisplay(collection, true);
  const widgets = createHomeWidgetRepository('default', database);
  await widgets.save({
    kind: 'note',
    label: 'Ideas',
    text: 'Private scratchpad.',
    visible: false,
  });
  const list = await widgets.save({
    kind: 'tasks',
    label: 'Tasks',
    visible: false,
  });
  const task = await createWidgetTaskRepository('default', database).save(
    list,
    'Read a chapter',
  );
  await createWidgetTaskRepository('default', database).complete(task, true);
  await createAppearanceRepository('default', database).save({
    ...defaultAppearance,
    clock: '24',
  });
  await createSavedSearchRepository('default', database).save({
    name: 'Reading',
    query: 'domain:example.com',
  });
  await createContentFeedbackRepository('default', database).rate(
    'image',
    image.id,
    'like',
  );
  await createContentFeedbackRepository('default', database).rate(
    'quote',
    quote,
    'dislike',
  );
  await createWeatherRepository('default', database).configure(
    { label: 'Sample city', latitude: 48, longitude: 17 },
    'celsius',
  );
  await createLibraryPreferencesRepository('default', database).save({
    trackOpens: true,
  });
  await createFocusSessionRepository('default', database).start(25);
  return { bookmark, image: image.id, list };
}
it('round-trips all active content into a new space with remapped relationships and safe runtime defaults', async () => {
  const { bookmark } = await seed();
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  expect(Object.keys(archive.tables).sort()).toEqual([...SPACE_TABLES].sort());
  const restored = await repo.restore(archive, 'Recovered');
  const copy = await createSpaceBackupRepository(restored, database).export();
  expect(copy.tables.bookmarks[0]!.id).not.toBe(bookmark);
  expect(copy.tables.bookmarks[0]!.folderId).toBe(copy.tables.folders[0]!.id);
  expect(copy.tables.bookmarks[0]!.tags).toEqual([copy.tables.tags[0]!.id]);
  expect(copy.tables.backgrounds[0]!.imageId).toBe(
    copy.tables.albumImages[0]!.id,
  );
  expect(copy.tables.albumImages[0]!.albumId).toBe(copy.tables.albums[0]!.id);
  expect(copy.tables.quotes[0]!.collectionId).toBe(
    copy.tables.quoteCollections[0]!.id,
  );
  expect(copy.tables.widgetTasks[0]!.widgetId).toBe(
    copy.tables.homeWidgets.find((widget) => widget.kind === 'tasks')!.id,
  );
  expect(
    copy.tables.homeWidgets.find((widget) => widget.kind === 'note')!.text,
  ).toBe('Private scratchpad.');
  expect(copy.tables.widgetTasks[0]!.completed).toBe(true);
  expect(
    copy.tables.contentFeedback.find((row) => row.kind === 'image')!.itemId,
  ).toBe(copy.tables.albumImages[0]!.id);
  expect(copy.tables.preferences[0]!.clock).toBe('24');
  expect(copy.tables.weatherSettings[0]!.enabled).toBe(false);
  expect(copy.tables.libraryPreferences[0]!.trackOpens).toBe(false);
  expect(copy.tables.focusSessions[0]!.state).toBe('paused');
  expect(await database.bookmarks.get(bookmark)).toBeDefined();
  expect(await database.spaces.count()).toBe(2);
});
it('rejects malformed scopes, unsupported tables and broken graphs before writing', async () => {
  await seed();
  const repo = createSpaceBackupRepository('default', database);
  const archive = await repo.export();
  for (const mutate of [
    (a: typeof archive) => {
      a.tables.bookmarks[0]!.spaceId = 'foreign';
    },
    (a: typeof archive) => {
      a.tables.widgetTasks[0]!.widgetId = 'missing';
    },
    (a: typeof archive) => {
      a.tables.backgrounds[0]!.imageId = 'missing';
    },
    (a: typeof archive) => {
      a.tables.preferences[0]!.clock = 'invalid';
    },
  ]) {
    const altered = structuredClone(archive);
    mutate(altered);
    await expect(repo.restore(altered, 'Bad archive')).rejects.toThrow();
  }
  expect(await database.spaces.count()).toBe(1);
  expect(() =>
    validateSpaceBackup({
      ...archive,
      tables: { ...archive.tables, unknown: [] },
    }),
  ).toThrow('unknown');
  expect(() => parseSpaceBackup('{bad')).toThrow('valid complete');
});
it('rolls back the new space and all imported records on storage failure', async () => {
  await seed();
  const repo = createSpaceBackupRepository('default', database),
    archive = await repo.export();
  const counts = await Promise.all(
    database.tables.map((table) => table.count()),
  );
  const fail = () => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  };
  database.widgetTasks.hook('creating', fail);
  try {
    await expect(repo.restore(archive, 'Rollback')).rejects.toThrow(
      'Storage full',
    );
  } finally {
    database.widgetTasks.hook('creating').unsubscribe(fail);
  }
  expect(
    await Promise.all(database.tables.map((table) => table.count())),
  ).toEqual(counts);
});
it('keeps builtin content references stable and excludes deleted data', async () => {
  await database.open();
  const album = createAlbumRepository('default', database);
  await album.setBackground(
    'oasis:builtin:quiet-geometry',
    'oasis:builtin:jade-ridges',
  );
  const id = await createBookmarkRepository('default', database).save({
    title: 'Removed',
    url: 'https://example.com',
    description: '',
    isFavorite: false,
  });
  await createBookmarkRepository('default', database).remove(id);
  const repo = createSpaceBackupRepository('default', database);
  const archive = await repo.export();
  expect(archive.tables.bookmarks).toEqual([]);
  const target = await repo.restore(archive, 'Builtin copy');
  expect(
    (await createSpaceBackupRepository(target, database).export()).tables
      .backgrounds[0]!.imageId,
  ).toBe('oasis:builtin:jade-ridges');
});

it('round-trips the full supported space-name length', async () => {
  await database.open();
  const name = 'A'.repeat(80);
  await database.spaces.update('default', { name });
  const archive = await createSpaceBackupRepository(
    'default',
    database,
  ).export();
  expect(parseSpaceBackup(serializeSpaceBackup(archive)).space.name).toBe(name);
});

it('preserves optional focus cycles in paused restores and rejects invalid cycle data', async () => {
  await seed();
  const focus = createFocusSessionRepository('default', database);
  await focus.change('end');
  await focus.start(25, 5);
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  const restored = await repo.restore(archive, 'Cycle copy');
  const copy = await createFocusSessionRepository(restored, database).get();
  expect(copy?.state).toBe('paused');
  expect(copy?.cycle).toEqual({
    focusMinutes: 25,
    breakMinutes: 5,
    phase: 'focus',
    completedFocus: 0,
  });
  for (const mutation of [
    { breakMinutes: 0 },
    { focusMinutes: 121 },
    { completedFocus: -1 },
    { completedFocus: 1.5 },
    { phase: 'other' },
    { longBreakMinutes: 0 },
    { longBreakMinutes: 61 },
    { autoStart: 'yes' },
  ]) {
    const invalid = structuredClone(archive);
    Object.assign(invalid.tables.focusSessions[0]!.cycle as object, mutation);
    expect(() => parseSpaceBackup(JSON.stringify(invalid))).toThrow();
  }
  const long = structuredClone(archive);
  Object.assign(long.tables.focusSessions[0]!.cycle as object, {
    longBreakMinutes: 20,
    phase: 'break',
    completedFocus: 4,
  });
  Object.assign(long.tables.focusSessions[0]!, { remaining: 20 * 60_000 });
  expect(
    parseSpaceBackup(JSON.stringify(long)).tables.focusSessions[0]!.cycle,
  ).toMatchObject({ longBreakMinutes: 20 });
  Object.assign(long.tables.focusSessions[0]!.cycle as object, {
    completedFocus: 3,
  });
  expect(() => parseSpaceBackup(JSON.stringify(long))).toThrow('cycle timer');
});

it('restores desktop places with remapped targets and accepts older backups without them', async () => {
  const { bookmark } = await seed();
  const desktop = createDesktopRepository('default', database);
  const folder = (await database.folders.toArray())[0]!.id;
  const placed = await desktop.add('bookmark', bookmark);
  await desktop.add('folder', folder);
  await desktop.move(placed, 4, 2);
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  expect(archive.tables.desktopItems).toHaveLength(2);
  const restored = await repo.restore(archive, 'Desktop copy');
  const items = await createDesktopRepository(restored, database).list();
  const copiedLink = items.find((item) => item.kind === 'bookmark')!;
  expect([copiedLink.column, copiedLink.row]).toEqual([4, 2]);
  const target = await database.bookmarks.get(copiedLink.targetId);
  expect(target?.spaceId).toBe(restored);
  expect(target?.title).toBe('Guide');

  const legacy = structuredClone(archive) as unknown as {
    schemaVersion: number;
    tables: Record<string, unknown>;
  };
  legacy.schemaVersion = 25;
  delete legacy.tables.desktopItems;
  expect(parseSpaceBackup(JSON.stringify(legacy)).tables.desktopItems).toEqual(
    [],
  );
  for (const mutation of [
    { column: 8 },
    { targetId: 'missing' },
    { kind: 'widget' },
  ]) {
    const invalid = structuredClone(archive);
    Object.assign(invalid.tables.desktopItems[0]!, mutation);
    expect(() => parseSpaceBackup(JSON.stringify(invalid))).toThrow();
  }
  const overlapping = structuredClone(archive);
  Object.assign(overlapping.tables.desktopItems[1]!, {
    column: overlapping.tables.desktopItems[0]!.column,
    row: overlapping.tables.desktopItems[0]!.row,
  });
  expect(() => parseSpaceBackup(JSON.stringify(overlapping))).toThrow(
    'overlapping',
  );
  await createBookmarkRepository('default', database).remove(bookmark);
  expect((await repo.export()).tables.desktopItems).toHaveLength(1);
});

it('restores saved page text with highlights under the new bookmark IDs', async () => {
  const { bookmark } = await seed();
  const pages = createPageTextRepository('default', database);
  await pages.save(bookmark, 'Keep this sentence.');
  const record = (await pages.get(bookmark))!;
  await pages.addHighlight(bookmark, record.updatedAt, 5, 9, 'Note');
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  expect(archive.tables.pageTexts).toHaveLength(1);
  const restored = await repo.restore(archive, 'Text copy');
  const copied = (await database.bookmarks.toArray()).find(
    (item) => item.spaceId === restored,
  )!;
  const copy = await createPageTextRepository(restored, database).get(
    copied.id,
  );
  expect(copy?.text).toBe('Keep this sentence.');
  expect(copy?.highlights).toMatchObject([{ start: 5, end: 9, note: 'Note' }]);
  const invalid = structuredClone(archive);
  Object.assign(invalid.tables.pageTexts[0]!, { bookmarkId: 'missing' });
  expect(() => parseSpaceBackup(JSON.stringify(invalid))).toThrow();
  const legacy = structuredClone(archive) as unknown as {
    tables: Record<string, unknown>;
  };
  delete legacy.tables.pageTexts;
  expect(parseSpaceBackup(JSON.stringify(legacy)).tables.pageTexts).toEqual([]);
});

it('restores content source switches without cached items and with the quote off', async () => {
  await seed();
  const providers = createContentProviderRepository('default', database);
  await providers.setEnabled('picture', true);
  await providers.setEnabled('quote', true);
  await providers.storeQuote({ day: 'd', text: 'Cached', author: 'A' });
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  expect(archive.tables.contentProviders[0]).not.toHaveProperty('dailyQuote');
  const restored = await repo.restore(archive, 'Sources copy');
  expect(
    await createContentProviderRepository(restored, database).get(),
  ).toMatchObject({ picture: true, quote: false });
  expect(
    (await createContentProviderRepository(restored, database).get())
      .dailyQuote,
  ).toBeUndefined();
});

it('restores the capture folder under its new ID', async () => {
  await seed();
  const folder = (await database.folders.toArray())[0]!;
  await createLibraryPreferencesRepository('default', database).save({
    captureFolderId: folder.id,
  });
  const repo = createSpaceBackupRepository('default', database);
  const archive = parseSpaceBackup(serializeSpaceBackup(await repo.export()));
  const restored = await repo.restore(archive, 'Capture copy');
  const preferences = await createLibraryPreferencesRepository(
    restored,
    database,
  ).get();
  const target = await database.folders.get(preferences.captureFolderId!);
  expect(target?.spaceId).toBe(restored);
  expect(target?.name).toBe(folder.name);
  const orphan = structuredClone(archive);
  Object.assign(orphan.tables.libraryPreferences[0]!, {
    captureFolderId: 'missing',
  });
  expect(
    parseSpaceBackup(JSON.stringify(orphan)).tables.libraryPreferences[0],
  ).not.toHaveProperty('captureFolderId');
});
