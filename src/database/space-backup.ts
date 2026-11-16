import { db, SCHEMA_VERSION, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import { createSpaceRepository } from './spaces';
import { validateBackup, MAX_BACKUP_BYTES } from './backup';
import { validateAlbumArchive, type AlbumArchive } from './albums';
import { validateQuoteArchive, type QuoteArchive } from './quotes';
import { validateAppearance, type Appearance } from './appearance';
import {
  validateLibraryPreferences,
  type LibraryPreferences,
} from './library-preferences';
import { validateDashboardItems, type DashboardItem } from './dashboard-layout';
import { validateWidget, type WidgetInput } from './home-widgets';
import { validateSavedSearch } from './saved-searches';
import {
  validateLocation,
  validateForecast,
  type WeatherLocation,
  type WeatherForecast,
} from './weather';
import { focusRemaining, type FocusSession } from './focus-session';
import { taskText } from './widget-tasks';
import { builtinAlbums } from './builtin-albums';
export const SPACE_TABLES = [
  'bookmarks',
  'folders',
  'tags',
  'preferences',
  'albums',
  'albumImages',
  'backgrounds',
  'quoteCollections',
  'quotes',
  'quoteSettings',
  'libraryPreferences',
  'dailyFocus',
  'homeWidgets',
  'focusSessions',
  'weatherSettings',
  'dashboardLayouts',
  'contentFeedback',
  'savedSearches',
  'widgetTasks',
] as const;
type TableName = (typeof SPACE_TABLES)[number];
type Row = {
  id: string;
  spaceId: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
};
export interface SpaceBackup {
  format: 'oasis-space';
  version: 1;
  schemaVersion: number;
  exportedAt: number;
  space: { name: string; icon?: string; color?: string };
  tables: Record<TableName, Row[]>;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Choose a valid complete space backup.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 1000): string {
  if (typeof value !== 'string' || !value || value.length > max)
    throw new Error('The space backup contains invalid text.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error('The space backup contains invalid dates or numbers.');
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean')
    throw new Error('The space backup contains invalid preferences.');
  return value;
}
function optionalId(value: unknown) {
  return value === undefined ? undefined : text(value, 200);
}
function enumValue<T extends string>(value: unknown, values: readonly T[]): T {
  if (!values.includes(value as T))
    throw new Error('The space backup contains an unsupported option.');
  return value as T;
}
function metadata(r: Record<string, unknown>): Row {
  if (r.spaceId !== 'default' || r.deletedAt !== undefined)
    throw new Error(
      'Complete backups must contain active records from one space.',
    );
  return {
    id: text(r.id),
    spaceId: 'default',
    createdAt: number(r.createdAt),
    updatedAt: number(r.updatedAt),
  };
}
function uniqueNames(rows: Row[]) {
  const names = rows.map((row) => String(row.name).toLowerCase());
  if (new Set(names).size !== names.length)
    throw new Error('The space backup contains duplicate names.');
}
export function validateSpaceBackup(value: unknown): SpaceBackup {
  const input = object(value),
    space = object(input.space),
    tables = object(input.tables);
  if (
    input.format !== 'oasis-space' ||
    input.version !== 1 ||
    !Number.isInteger(input.schemaVersion) ||
    Number(input.schemaVersion) > SCHEMA_VERSION ||
    Number(input.schemaVersion) < 21
  )
    throw new Error(
      'This complete space backup needs a compatible Oasis version.',
    );
  if (
    Object.keys(tables).some((key) => !SPACE_TABLES.includes(key as TableName))
  )
    throw new Error('The space backup contains unknown data tables.');
  const normalized = {} as Record<TableName, Row[]>;
  for (const name of SPACE_TABLES) {
    const rows = tables[name];
    if (!Array.isArray(rows) || rows.length > 100000)
      throw new Error(
        'The space backup contains a missing or oversized table.',
      );
    normalized[name] = rows.map((value) => {
      const r = object(value);
      return { ...r, ...metadata(r) };
    });
    if (new Set(normalized[name].map((row) => row.id)).size !== rows.length)
      throw new Error('The space backup contains duplicate IDs.');
  }
  const library = validateBackup({
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: number(input.exportedAt),
    bookmarks: normalized.bookmarks,
    folders: normalized.folders,
    tags: normalized.tags,
  });
  normalized.bookmarks = library.bookmarks as unknown as Row[];
  normalized.folders = library.folders as unknown as Row[];
  normalized.tags = library.tags as unknown as Row[];
  const albums = validateAlbumArchive({
    format: 'oasis-albums',
    version: 1,
    albums: normalized.albums,
    images: normalized.albumImages,
  } as unknown as AlbumArchive);
  normalized.albums = albums.albums as unknown as Row[];
  normalized.albumImages = albums.images as unknown as Row[];
  const quotes = validateQuoteArchive({
    format: 'oasis-quotes',
    version: 1,
    collections: normalized.quoteCollections,
    quotes: normalized.quotes,
  } as unknown as QuoteArchive);
  normalized.quoteCollections = quotes.collections as unknown as Row[];
  normalized.quotes = quotes.quotes as unknown as Row[];
  const singleton: TableName[] = [
    'preferences',
    'backgrounds',
    'quoteSettings',
    'libraryPreferences',
    'focusSessions',
    'weatherSettings',
    'dashboardLayouts',
  ];
  for (const name of singleton)
    if (normalized[name].length > 1)
      throw new Error('The space backup contains duplicate settings.');
  normalized.preferences = normalized.preferences.map((r) => ({
    ...metadata(r),
    ...validateAppearance(r as unknown as Appearance),
  }));
  normalized.libraryPreferences = normalized.libraryPreferences.map((r) => ({
    ...metadata(r),
    ...validateLibraryPreferences(r as unknown as LibraryPreferences),
  }));
  normalized.dashboardLayouts = normalized.dashboardLayouts.map((r) => ({
    ...metadata(r),
    items: validateDashboardItems(r.items as DashboardItem[]),
  }));
  normalized.homeWidgets = normalized.homeWidgets.map((r) => ({
    ...metadata(r),
    ...validateWidget(r as unknown as WidgetInput),
  }));
  for (const kind of ['clock', 'countdown', 'note', 'tasks'])
    if (normalized.homeWidgets.filter((r) => r.kind === kind).length > 3)
      throw new Error('The space backup exceeds the widget limit.');
  const widgetMap = new Map(normalized.homeWidgets.map((r) => [r.id, r]));
  normalized.widgetTasks = normalized.widgetTasks.map((r) => {
    const widgetId = text(r.widgetId, 200);
    if (widgetMap.get(widgetId)?.kind !== 'tasks')
      throw new Error('A task is missing its task list.');
    return {
      ...metadata(r),
      widgetId,
      text: taskText(text(r.text, 200)),
      completed: bool(r.completed),
    };
  });
  for (const widget of normalized.homeWidgets)
    if (
      normalized.widgetTasks.filter((r) => r.widgetId === widget.id).length > 50
    )
      throw new Error('The space backup exceeds the task limit.');
  normalized.savedSearches = normalized.savedSearches.map((r) => ({
    ...metadata(r),
    ...validateSavedSearch({ name: text(r.name, 80), query: text(r.query) }),
  }));
  if (normalized.savedSearches.length > 50)
    throw new Error('The space backup exceeds the saved-search limit.');
  uniqueNames(normalized.savedSearches);
  normalized.dailyFocus = normalized.dailyFocus.map((r) => {
    const day = text(r.day, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day)) ||
      new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day
    )
      throw new Error('The space backup contains an invalid focus date.');
    return {
      ...metadata(r),
      day,
      title:
        typeof r.title === 'string' && r.title.length <= 200
          ? r.title
          : text(r.title, 200),
      completed: bool(r.completed),
    };
  });
  if (
    new Set(normalized.dailyFocus.map((r) => r.day)).size !==
    normalized.dailyFocus.length
  )
    throw new Error('The space backup contains duplicate focus days.');
  normalized.focusSessions = normalized.focusSessions.map((r) => {
    const remaining = number(r.remaining);
    if (remaining > 120 * 60000)
      throw new Error('The space backup contains an invalid timer.');
    let cycle;
    if (r.cycle !== undefined) {
      const input = object(r.cycle);
      const focusMinutes = number(input.focusMinutes);
      const breakMinutes = number(input.breakMinutes);
      const completedFocus = number(input.completedFocus);
      if (
        !Number.isInteger(focusMinutes) ||
        focusMinutes < 1 ||
        focusMinutes > 120 ||
        !Number.isInteger(breakMinutes) ||
        breakMinutes < 1 ||
        breakMinutes > 60 ||
        !Number.isSafeInteger(completedFocus)
      )
        throw new Error('The space backup contains an invalid focus cycle.');
      cycle = {
        focusMinutes,
        breakMinutes,
        completedFocus,
        phase: enumValue(input.phase, ['focus', 'break']),
      };
      if (
        remaining >
        (cycle.phase === 'focus' ? focusMinutes : breakMinutes) * 60_000
      )
        throw new Error('The space backup contains an invalid cycle timer.');
    }
    return {
      ...metadata(r),
      ...(cycle === undefined ? {} : { cycle }),
      state: enumValue(r.state, ['running', 'paused', 'ended']),
      remaining,
      endsAt: number(r.endsAt),
    };
  });
  normalized.weatherSettings = normalized.weatherSettings.map((r) => ({
    ...metadata(r),
    enabled: bool(r.enabled),
    location: validateLocation(r.location as WeatherLocation),
    unit: enumValue(r.unit, ['celsius', 'fahrenheit']),
    ...(r.forecast === undefined
      ? {}
      : { forecast: validateForecast(r.forecast as WeatherForecast) }),
  }));
  const builtin = builtinAlbums('default');
  const albumIds = new Set(
      [...normalized.albums, ...builtin.albums].map((r) => r.id),
    ),
    imageMap = new Map(
      [...normalized.albumImages, ...builtin.images].map((r) => [r.id, r]),
    );
  normalized.backgrounds = normalized.backgrounds.map((r) => {
    const albumId = optionalId(r.albumId),
      imageId = optionalId(r.imageId),
      dimming = number(r.dimming);
    if (
      (albumId && !albumIds.has(albumId)) ||
      (imageId && imageMap.get(imageId)?.albumId !== albumId) ||
      dimming < 0.6 ||
      dimming > 0.85
    )
      throw new Error(
        'The background refers to missing content or invalid dimming.',
      );
    return {
      ...metadata(r),
      albumId,
      imageId,
      dimming,
      rotateDaily: bool(r.rotateDaily),
      ...(r.mixAllAlbums === undefined
        ? {}
        : { mixAllAlbums: bool(r.mixAllAlbums) }),
    };
  });
  const collectionIds = new Set(normalized.quoteCollections.map((r) => r.id));
  normalized.quoteSettings = normalized.quoteSettings.map((r) => {
    const collectionId = optionalId(r.collectionId);
    if (collectionId && !collectionIds.has(collectionId))
      throw new Error('The selected quote collection is missing.');
    return { ...metadata(r), collectionId, visible: bool(r.visible) };
  });
  normalized.contentFeedback = normalized.contentFeedback.map((r) => ({
    ...metadata(r),
    kind: enumValue(r.kind, ['image', 'quote']),
    itemId: text(r.itemId, 200),
    rating: enumValue(r.rating, ['like', 'dislike']),
  }));
  if (
    new Set(
      normalized.contentFeedback.map((r) => JSON.stringify([r.kind, r.itemId])),
    ).size !== normalized.contentFeedback.length
  )
    throw new Error('The space backup contains duplicate content preferences.');
  return {
    format: 'oasis-space',
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: number(input.exportedAt),
    space: {
      name: text(space.name, 80),
      ...(space.icon === undefined ? {} : { icon: text(space.icon, 200) }),
      ...(space.color === undefined ? {} : { color: text(space.color, 200) }),
    },
    tables: normalized,
  };
}
export function serializeSpaceBackup(value: SpaceBackup) {
  const json = JSON.stringify(validateSpaceBackup(value));
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES)
    throw new Error(
      'This space backup exceeds 64 MB. Split content into smaller spaces before downloading.',
    );
  return json;
}
export function parseSpaceBackup(json: string) {
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES)
    throw new Error('Choose a complete space backup no larger than 64 MB.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Choose a valid complete space backup.');
  }
  return validateSpaceBackup(value);
}

export function createSpaceBackupRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async export() {
      return database.transaction('r', database.tables, async () => {
        await requireSpace(database, spaceId);
        const space = (await database.spaces.get(spaceId))!;
        const tables = {} as Record<TableName, Row[]>;
        for (const name of SPACE_TABLES)
          tables[name] = (
            await database
              .table<Row, string>(name)
              .where('spaceId')
              .equals(spaceId)
              .filter((r) => r.deletedAt === undefined)
              .toArray()
          ).map((r) => ({ ...r, spaceId: 'default' }));
        return validateSpaceBackup({
          format: 'oasis-space',
          version: 1,
          schemaVersion: SCHEMA_VERSION,
          exportedAt: Date.now(),
          space,
          tables,
        });
      });
    },
    async restore(input: unknown, name: string) {
      const archive = validateSpaceBackup(input);
      return database.transaction('rw', database.tables, async () => {
        await requireSpace(database, spaceId);
        const target = await createSpaceRepository(database).save(name);
        const sourceSpace = (await database.spaces.get(target))!;
        await database.spaces.put({
          ...sourceSpace,
          ...archive.space,
          name: sourceSpace.name,
          id: target,
        });
        const maps = Object.fromEntries(
          SPACE_TABLES.map((table) => [
            table,
            new Map(
              archive.tables[table].map((row) => [row.id, crypto.randomUUID()]),
            ),
          ]),
        ) as Record<TableName, Map<string, string>>;
        const builtin = builtinAlbums(target),
          builtinAlbumsIds = new Set(builtin.albums.map((r) => r.id)),
          builtinImageIds = new Set(builtin.images.map((r) => r.id));
        function reference(
          table: TableName,
          value: unknown,
          allowBuiltin = false,
          allowMissing = false,
        ): string | undefined {
          if (value === undefined) return;
          const id = String(value);
          if (
            allowBuiltin &&
            ((table === 'albums' && builtinAlbumsIds.has(id)) ||
              (table === 'albumImages' && builtinImageIds.has(id)))
          )
            return id;
          let result = maps[table].get(id);
          if (!result && allowMissing) {
            result = crypto.randomUUID();
            maps[table].set(id, result);
          }
          if (!result)
            throw new Error(
              'The space backup contains a missing relationship.',
            );
          return result;
        }
        const suffix: Partial<Record<TableName, string>> = {
          preferences: 'appearance',
          backgrounds: 'background',
          quoteSettings: 'quotes',
          libraryPreferences: 'library',
          dashboardLayouts: 'layout',
          weatherSettings: 'weather',
          focusSessions: 'focus-session',
        };
        for (const table of SPACE_TABLES) {
          const rows = archive.tables[table].map((source) => {
            const row: Row = {
              ...source,
              id: suffix[table]
                ? `${target}:${suffix[table]}`
                : maps[table].get(source.id)!,
              spaceId: target,
            };
            if (table === 'bookmarks') {
              row.folderId = reference('folders', source.folderId);
              row.tags = (source.tags as string[]).map((id) =>
                reference('tags', id)!,
              );
            }
            if (table === 'folders')
              row.parentId = reference('folders', source.parentId);
            if (table === 'albumImages')
              row.albumId = reference('albums', source.albumId);
            if (table === 'backgrounds') {
              row.albumId = reference('albums', source.albumId, true);
              row.imageId = reference('albumImages', source.imageId, true);
            }
            if (table === 'quotes' || table === 'quoteSettings')
              row.collectionId = reference(
                'quoteCollections',
                source.collectionId,
              );
            if (table === 'widgetTasks')
              row.widgetId = reference('homeWidgets', source.widgetId);
            if (table === 'contentFeedback') {
              row.itemId = reference(
                source.kind === 'image' ? 'albumImages' : 'quotes',
                source.itemId,
                source.kind === 'image',
                true,
              );
              row.id = JSON.stringify([target, row.kind, row.itemId]);
            }
            if (table === 'weatherSettings') row.enabled = false;
            if (table === 'libraryPreferences') row.trackOpens = false;
            if (table === 'focusSessions') {
              const remaining = focusRemaining(
                source as unknown as FocusSession,
                archive.exportedAt,
              );
              row.state = remaining > 0 ? 'paused' : 'ended';
              row.remaining = remaining;
              row.endsAt = Date.now();
            }
            return row;
          });
          await database.table<Row, string>(table).bulkAdd(rows);
        }
        return target;
      });
    },
  };
}
