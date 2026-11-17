import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export const HOME_SECTIONS = {
  clock: 'Clock and date',
  search: 'Search',
  focus: 'Focus',
  favorites: 'Favorites',
  bookmarks: 'Bookmark sections',
  widgets: 'Widgets',
  weather: 'Weather',
  quote: 'Quote',
  desktop: 'Links desktop',
} as const;
export type HomeSection = keyof typeof HOME_SECTIONS;
const ADDED_SECTIONS: HomeSection[] = ['desktop'];
export interface DashboardItem {
  id: HomeSection;
  visible: boolean;
  width: 'normal' | 'wide';
}
export interface DashboardLayout extends RecordMetadata {
  spaceId: string;
  items: DashboardItem[];
}
export function defaultDashboardItems(): DashboardItem[] {
  return (Object.keys(HOME_SECTIONS) as HomeSection[]).map((id) => ({
    id,
    visible: id !== 'desktop',
    width: id === 'desktop' ? 'wide' : 'normal',
  }));
}
export function validateDashboardItems(
  input: DashboardItem[],
): DashboardItem[] {
  // Layouts saved before a section existed get it appended with its default.
  if (Array.isArray(input))
    input = [
      ...input,
      ...defaultDashboardItems().filter(
        (item) =>
          ADDED_SECTIONS.includes(item.id) &&
          !input.some((saved) => saved?.id === item.id),
      ),
    ];
  if (
    !Array.isArray(input) ||
    input.length !== Object.keys(HOME_SECTIONS).length ||
    new Set(input.map((item) => item?.id)).size !== input.length ||
    input.some(
      (item) =>
        !item ||
        !Object.hasOwn(HOME_SECTIONS, item.id) ||
        typeof item.visible !== 'boolean' ||
        !['normal', 'wide'].includes(item.width),
    )
  )
    throw new Error('Choose a valid Home layout.');
  return input.map(({ id, visible, width }) => ({ id, visible, width }));
}
export function createDashboardLayoutRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const id = `${spaceId}:layout`;
  async function existing() {
    const record = await database.dashboardLayouts.get(id);
    if (
      record &&
      (record.spaceId !== spaceId || record.deletedAt !== undefined)
    )
      throw new Error('Home layout is unavailable.');
    return record;
  }
  return {
    get() {
      return database.transaction(
        'r',
        database.spaces,
        database.dashboardLayouts,
        async () => {
          await requireSpace(database, spaceId);
          const record = await existing();
          return record
            ? { ...record, items: validateDashboardItems(record.items) }
            : {
                id,
                spaceId,
                items: defaultDashboardItems(),
                createdAt: 0,
                updatedAt: 0,
              };
        },
      );
    },
    async save(items: DashboardItem[], revision: number) {
      const values = validateDashboardItems(items);
      await database.transaction(
        'rw',
        database.spaces,
        database.dashboardLayouts,
        async () => {
          await requireSpace(database, spaceId);
          const record = await existing();
          if ((record?.updatedAt ?? 0) !== revision)
            throw new Error(
              'Layout changed in another tab. Reopen Layout to review the latest version.',
            );
          const now = Math.max(Date.now(), (record?.updatedAt ?? 0) + 1);
          await database.dashboardLayouts.put({
            id,
            spaceId,
            items: values,
            createdAt: record?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
  };
}
