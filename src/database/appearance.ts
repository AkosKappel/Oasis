import { SEARCH_ENGINES, type SearchEngine } from '@/lib/search-engines';
import { normalizeHex } from '@/lib/colors';
import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';

export interface Appearance {
  theme: 'system' | 'light' | 'dark';
  accent: 'forest' | 'ocean' | 'plum';
  clock: 'system' | '12' | '24';
  showDate: boolean;
  showDailyFocus?: boolean;
  searchEngine?: SearchEngine;
  showFavorites: boolean;
  showRecentBookmarks?: boolean;
  showFrequentBookmarks?: boolean;
  linksSide: 'left' | 'right';
  linksPinned: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}
export interface AppearanceRecord extends Appearance, RecordMetadata {
  spaceId: string;
}
export const defaultAppearance: Appearance = {
  theme: 'system',
  accent: 'forest',
  clock: 'system',
  showDate: true,
  showFavorites: false,
  linksSide: 'left',
  linksPinned: false,
};
export function validateAppearance(value: Appearance): Appearance {
  if (
    !['system', 'light', 'dark'].includes(value.theme) ||
    !['forest', 'ocean', 'plum'].includes(value.accent) ||
    !['system', '12', '24'].includes(value.clock) ||
    typeof value.showDate !== 'boolean' ||
    (value.searchEngine !== undefined &&
      !SEARCH_ENGINES.some((engine) => engine.id === value.searchEngine)) ||
    (value.showDailyFocus !== undefined &&
      typeof value.showDailyFocus !== 'boolean') ||
    (value.showRecentBookmarks !== undefined &&
      typeof value.showRecentBookmarks !== 'boolean') ||
    (value.showFrequentBookmarks !== undefined &&
      typeof value.showFrequentBookmarks !== 'boolean') ||
    typeof value.showFavorites !== 'boolean' ||
    !['left', 'right'].includes(value.linksSide ?? 'left') ||
    (value.linksPinned !== undefined && typeof value.linksPinned !== 'boolean')
  ) {
    throw new Error('Choose valid appearance settings.');
  }
  const primaryColor =
    value.primaryColor === undefined
      ? undefined
      : normalizeHex(value.primaryColor);
  const secondaryColor =
    value.secondaryColor === undefined
      ? undefined
      : normalizeHex(value.secondaryColor);
  if (
    (value.primaryColor !== undefined && !primaryColor) ||
    (value.secondaryColor !== undefined && !secondaryColor)
  )
    throw new Error('Enter colors as hex values, such as #286443.');
  return {
    theme: value.theme,
    accent: value.accent,
    clock: value.clock,
    showDate: value.showDate,
    ...(value.searchEngine !== undefined
      ? { searchEngine: value.searchEngine }
      : {}),
    ...(value.showDailyFocus !== undefined
      ? { showDailyFocus: value.showDailyFocus }
      : {}),
    showFavorites: value.showFavorites,
    ...(value.showRecentBookmarks !== undefined
      ? { showRecentBookmarks: value.showRecentBookmarks }
      : {}),
    ...(value.showFrequentBookmarks !== undefined
      ? { showFrequentBookmarks: value.showFrequentBookmarks }
      : {}),
    linksSide: value.linksSide ?? 'left',
    linksPinned: value.linksPinned ?? false,
    ...(primaryColor ? { primaryColor } : {}),
    ...(secondaryColor ? { secondaryColor } : {}),
  };
}
export function createAppearanceRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async get(): Promise<Appearance> {
      return database.transaction(
        'r',
        database.spaces,
        database.preferences,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await database.preferences.get(
            `${spaceId}:appearance`,
          );
          if (
            existing &&
            (existing.spaceId !== spaceId || existing.deletedAt !== undefined)
          )
            throw new Error('Appearance settings are unavailable.');
          return existing
            ? validateAppearance(existing)
            : { ...defaultAppearance };
        },
      );
    },
    async save(input: Appearance) {
      const values = validateAppearance(input);
      await database.transaction(
        'rw',
        database.spaces,
        database.preferences,
        async () => {
          await requireSpace(database, spaceId);
          const id = `${spaceId}:appearance`;
          const existing = await database.preferences.get(id);
          if (
            existing &&
            (existing.spaceId !== spaceId || existing.deletedAt !== undefined)
          )
            throw new Error('Appearance settings are unavailable.');
          const now = Date.now();
          await database.preferences.put({
            ...values,
            id,
            spaceId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
  };
}
export const personalAppearance = createAppearanceRepository('default');
