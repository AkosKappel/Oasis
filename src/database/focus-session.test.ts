import { afterEach, expect, it, vi } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createFocusSessionRepository,
  focusRemaining,
  timerText,
} from './focus-session';
const database = new OasisDatabase('sessions-test'),
  repository = createFocusSessionRepository('default', database);
afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});
it('uses absolute deadlines, pauses without drift and resumes after time away', async () => {
  await database.open();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
  await repository.start(1);
  await expect(repository.start(25)).rejects.toThrow('current session');
  clock.mockReturnValue(102_000);
  await repository.change('pause');
  const paused = (await repository.get())!;
  expect(focusRemaining(paused, 200_000)).toBe(58_000);
  clock.mockReturnValue(3_700_000);
  await repository.change('resume');
  const resumed = (await repository.get())!;
  expect(resumed.endsAt).toBe(3_758_000);
  expect(focusRemaining(resumed, 3_758_001)).toBe(0);
  expect(timerText(58_001)).toBe('00:59');
  clock.mockReturnValue(3_758_001);
  await repository.start(25);
  await repository.change('end');
  expect((await repository.get())?.state).toBe('ended');
  await expect(repository.start(0)).rejects.toThrow('120');
});
it('checks ownership and rolls back failed timer changes', async () => {
  await database.open();
  await repository.start(25);
  const fail = () => {
    throw new Error('Storage failed');
  };
  database.focusSessions.hook('updating', fail);
  try {
    await expect(repository.change('pause')).rejects.toThrow('Storage failed');
  } finally {
    database.focusSessions.hook('updating').unsubscribe(fail);
  }
  expect((await repository.get())?.state).toBe('running');
  await expect(
    createFocusSessionRepository('missing', database).start(25),
  ).rejects.toThrow('space');
});
