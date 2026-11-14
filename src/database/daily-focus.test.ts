import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createDailyFocusRepository, localDay } from './daily-focus';
const database = new OasisDatabase('daily-focus-test');
const repository = createDailyFocusRepository('default', database);
afterEach(() => database.delete());
it('persists a single daily goal, completion and separate local days', async () => {
  await database.open();
  await repository.save('2026-11-14', ' Ship the first draft ');
  await repository.complete('2026-11-14', true);
  await repository.save('2026-11-14', 'Review the draft');
  expect(await repository.get('2026-11-14')).toMatchObject({
    title: 'Review the draft',
    completed: true,
  });
  expect(await database.dailyFocus.count()).toBe(1);
  expect(await repository.get('2026-11-15')).toBeUndefined();
  await repository.save('2026-11-15', 'Rest');
  expect((await repository.get('2026-11-15'))?.completed).toBe(false);
  expect(localDay(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02');
  await expect(repository.save('2026-02-30', 'Invalid')).rejects.toThrow('day');
  await expect(repository.save('2026-11-14', ' ')).rejects.toThrow('focus');
  await expect(
    createDailyFocusRepository('missing', database).save('2026-11-14', 'Other'),
  ).rejects.toThrow('space');
});
it('keeps the old goal when a write fails', async () => {
  await database.open();
  await repository.save('2026-11-14', 'Keep this');
  const fail = () => {
    throw new Error('Quota exceeded');
  };
  database.dailyFocus.hook('updating', fail);
  try {
    await expect(repository.save('2026-11-14', 'New draft')).rejects.toThrow(
      'Quota',
    );
  } finally {
    database.dailyFocus.hook('updating').unsubscribe(fail);
  }
  expect((await repository.get('2026-11-14'))?.title).toBe('Keep this');
});
