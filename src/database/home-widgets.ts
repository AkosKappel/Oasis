import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export type WidgetInput =
  | { kind: 'tasks'; label: string; visible: boolean }
  | { kind: 'note'; label: string; text: string; visible: boolean }
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
  if (input.kind === 'tasks')
    return { kind: 'tasks', label: input.label.trim(), visible: input.visible };
  if (input.kind === 'note') {
    if (typeof input.text !== 'string' || input.text.length > 10000)
      throw new Error('Keep a note within 10,000 characters.');
    return {
      kind: 'note',
      label: input.label.trim(),
      text: input.text,
      visible: input.visible,
    };
  }
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
    async save(input: WidgetInput, id?: string, expectedUpdatedAt?: number) {
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
          if (
            (existing?.kind === 'note' || existing?.kind === 'tasks') &&
            existing.updatedAt !== expectedUpdatedAt
          )
            throw new Error(
              'This widget changed. Reopen it before saving. Your draft is kept.',
            );
          const count = await database.homeWidgets
            .where('spaceId')
            .equals(spaceId)
            .filter(
              (item) =>
                item.kind === value.kind && item.deletedAt === undefined,
            )
            .count();
          if (!existing && count >= 3)
            throw new Error('Keep up to three widgets of each type.');
          const now = Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1);
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
    async remove(id: string, expectedUpdatedAt?: number) {
      await database.transaction(
        'rw',
        database.spaces,
        database.homeWidgets,
        database.widgetTasks,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await requireOwnedRecord(
            database.homeWidgets,
            id,
            spaceId,
            'widget',
          );
          if (
            (existing.kind === 'note' || existing.kind === 'tasks') &&
            existing.updatedAt !== expectedUpdatedAt
          )
            throw new Error('This widget changed. Review it before removing.');
          if (existing.kind === 'tasks')
            await database.widgetTasks
              .where('[spaceId+widgetId]')
              .equals([spaceId, id])
              .filter((task) => task.deletedAt === undefined)
              .modify((task) => {
                const now = Math.max(Date.now(), task.updatedAt + 1);
                task.deletedAt = now;
                task.updatedAt = now;
              });
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
