import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';

export interface DailyFocus extends RecordMetadata {
  spaceId: string;
  day: string;
  title: string;
  completed: boolean;
}
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function validateDay(day: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) ||
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day
  )
    throw new Error('Choose a valid day.');
}
export function createDailyFocusRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  async function current(day: string) {
    return database.dailyFocus
      .where('[spaceId+day]')
      .equals([spaceId, day])
      .filter((item) => item.deletedAt === undefined)
      .first();
  }
  return {
    async get(day: string) {
      validateDay(day);
      return database.transaction(
        'r',
        database.spaces,
        database.dailyFocus,
        async () => {
          await requireSpace(database, spaceId);
          return current(day);
        },
      );
    },
    async save(day: string, title: string) {
      validateDay(day);
      if (
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 160
      )
        throw new Error('Keep your focus between 1 and 160 characters.');
      await database.transaction(
        'rw',
        database.spaces,
        database.dailyFocus,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current(day);
          const now = Date.now();
          await database.dailyFocus.put({
            id: existing?.id ?? crypto.randomUUID(),
            spaceId,
            day,
            title: title.trim(),
            completed: existing?.completed ?? false,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
    async complete(day: string, completed: boolean) {
      validateDay(day);
      if (typeof completed !== 'boolean')
        throw new Error('Choose a valid focus status.');
      await database.transaction(
        'rw',
        database.spaces,
        database.dailyFocus,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current(day);
          if (!existing) throw new Error('Set a focus first.');
          await database.dailyFocus.update(existing.id, {
            completed,
            updatedAt: Date.now(),
          });
        },
      );
    },
  };
}
export const personalDailyFocus = createDailyFocusRepository('default');
