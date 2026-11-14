import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export type WidgetInput =
  | { kind: 'clock'; label: string; timeZone: string; visible: boolean }
  | { kind: 'countdown'; label: string; deadline: number; visible: boolean };
export type HomeWidget = WidgetInput & RecordMetadata & { spaceId: string };
export function validTimeZone(zone: string) {
  try {
    if (typeof zone !== 'string' || zone.length > 100) return false;
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export function validateWidget(input: WidgetInput): WidgetInput {
  if (
    !input ||
    typeof input.label !== 'string' ||
    !input.label.trim() ||
    input.label.trim().length > 40 ||
    typeof input.visible !== 'boolean'
  )
    throw new Error('Use a label between 1 and 40 characters.');
  if (input.kind === 'clock' && validTimeZone(input.timeZone))
    return {
      kind: 'clock',
      label: input.label.trim(),
      timeZone: input.timeZone,
      visible: input.visible,
    };
  if (
    input.kind === 'countdown' &&
    Number.isSafeInteger(input.deadline) &&
    input.deadline >= 0 &&
    input.deadline <= 8_640_000_000_000_000
  )
    return {
      kind: 'countdown',
      label: input.label.trim(),
      deadline: input.deadline,
      visible: input.visible,
    };
  throw new Error('Choose a valid time zone or countdown date.');
}
export function countdownText(deadline: number, now: number) {
  const minutes = Math.max(0, Math.ceil((deadline - now) / 60_000));
  if (!minutes) return 'Reached';
  const days = Math.floor(minutes / 1440),
    hours = Math.floor((minutes % 1440) / 60),
    remaining = minutes % 60;
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${remaining || (!days && !hours) ? `${remaining}m` : ''}`.trim();
}
export function localDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function parseDeadline(value: string) {
  const timestamp = new Date(value).getTime();
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(timestamp) ||
    localDateTime(timestamp) !== value
  )
    throw new Error('Choose a valid local date and time.');
  return timestamp;
}
export function createHomeWidgetRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    async list() {
      return database.transaction(
        'r',
        database.spaces,
        database.homeWidgets,
        async () => {
          await requireSpace(database, spaceId);
          return database.homeWidgets
            .where('spaceId')
            .equals(spaceId)
            .filter((item) => item.deletedAt === undefined)
            .sortBy('createdAt');
        },
      );
    },
    async save(input: WidgetInput, id?: string) {
      const value = validateWidget(input);
      return database.transaction(
        'rw',
        database.spaces,
        database.homeWidgets,
        async () => {
          await requireSpace(database, spaceId);
          const existing = id
            ? await requireOwnedRecord(
                database.homeWidgets,
                id,
                spaceId,
                'widget',
              )
            : undefined;
          if (existing && existing.kind !== value.kind)
            throw new Error('Edit the same kind of widget.');
          const count = await database.homeWidgets
            .where('spaceId')
            .equals(spaceId)
            .filter(
              (item) =>
                item.kind === value.kind && item.deletedAt === undefined,
            )
            .count();
          if (!existing && count >= 3)
            throw new Error('Keep up to three clocks and three countdowns.');
          const now = Date.now();
          const widget: HomeWidget = {
            ...value,
            id: existing?.id ?? crypto.randomUUID(),
            spaceId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          await database.homeWidgets.put(widget);
          return widget.id;
        },
      );
    },
    async remove(id: string) {
      await database.transaction(
        'rw',
        database.spaces,
        database.homeWidgets,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(database.homeWidgets, id, spaceId, 'widget');
          await database.homeWidgets.update(id, {
            deletedAt: Date.now(),
            updatedAt: Date.now(),
          });
        },
      );
    },
  };
}
export const personalHomeWidgets = createHomeWidgetRepository('default');
