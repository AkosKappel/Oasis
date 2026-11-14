import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createHomeWidgetRepository,
  countdownText,
  parseDeadline,
  validTimeZone,
} from './home-widgets';
const database = new OasisDatabase('widgets-test');
const repository = createHomeWidgetRepository('default', database);
afterEach(() => database.delete());
it('validates clocks, dates and daylight-saving boundaries', () => {
  expect(validTimeZone('Not/AZone')).toBe(false);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  expect(formatter.format(new Date('2026-03-08T06:59:00Z'))).toBe('01:59');
  expect(formatter.format(new Date('2026-03-08T07:00:00Z'))).toBe('03:00');
  expect(countdownText(86_460_000, 0)).toBe('1d 1m');
  expect(countdownText(1000, 0)).toBe('1m');
  expect(countdownText(1000, 1001)).toBe('Reached');
  expect(() => parseDeadline('2026-02-30T12:00')).toThrow('date');
  expect(() => parseDeadline('not a date')).toThrow('date');
});
it('bounds widgets per kind, preserves IDs on edits and soft deletes only owned records', async () => {
  await database.open();
  const first = await repository.save({
    kind: 'clock',
    label: 'Tokyo',
    timeZone: 'Asia/Tokyo',
    visible: true,
  });
  await repository.save(
    {
      kind: 'clock',
      label: 'Tokyo office',
      timeZone: 'Asia/Tokyo',
      visible: false,
    },
    first,
  );
  await repository.save({
    kind: 'clock',
    label: 'London',
    timeZone: 'Europe/London',
    visible: true,
  });
  await repository.save({
    kind: 'clock',
    label: 'UTC',
    timeZone: 'UTC',
    visible: true,
  });
  await expect(
    repository.save({
      kind: 'clock',
      label: 'Extra',
      timeZone: 'UTC',
      visible: true,
    }),
  ).rejects.toThrow('three');
  await expect(
    repository.save({
      kind: 'clock',
      label: 'Wrong',
      timeZone: 'No/Zone',
      visible: true,
    }),
  ).rejects.toThrow('valid');
  expect(
    (await repository.list()).find((item) => item.id === first)?.visible,
  ).toBe(false);
  await database.transaction('rw', database.spaces, () =>
    database.spaces.add({
      id: 'other',
      name: 'Other',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(
    createHomeWidgetRepository('other', database).remove(first),
  ).rejects.toThrow('widget');
  await repository.remove(first);
  expect((await database.homeWidgets.get(first))?.deletedAt).toBeTypeOf(
    'number',
  );
  expect(await repository.list()).toHaveLength(2);
  await expect(
    repository.save(
      {
        kind: 'countdown',
        label: 'Changed type',
        deadline: Date.now(),
        visible: true,
      },
      (await repository.list())[0]!.id,
    ),
  ).rejects.toThrow('same kind');
});
