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

it('advances cycles only on request and rejects stale requests across tabs', async () => {
  await database.open();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
  await repository.start(25, 5);
  const initial = (await repository.get())!;
  await expect(repository.nextPhase(initial.endsAt)).rejects.toThrow('changed');
  clock.mockReturnValue(initial.endsAt + 3_600_000);
  expect((await repository.get())?.cycle?.phase).toBe('focus');
  const results = await Promise.allSettled([
    repository.nextPhase(initial.endsAt),
    repository.nextPhase(initial.endsAt),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
  const rest = (await repository.get())!;
  expect(rest.cycle).toEqual({
    focusMinutes: 25,
    breakMinutes: 5,
    phase: 'break',
    completedFocus: 1,
  });
  expect(focusRemaining(rest, Date.now())).toBe(300_000);
  clock.mockReturnValue(Date.now() + 60_000);
  await repository.change('pause');
  expect((await repository.get())?.remaining).toBe(240_000);
  clock.mockReturnValue(Date.now() + 900_000);
  await repository.change('resume');
  const resumed = (await repository.get())!;
  clock.mockReturnValue(resumed.endsAt);
  await repository.nextPhase(resumed.endsAt);
  const next = (await repository.get())!;
  expect(next.cycle?.phase).toBe('focus');
  expect(next.cycle?.completedFocus).toBe(1);
  expect(next.remaining).toBe(25 * 60_000);
  await repository.change('end');
  await expect(repository.nextPhase(next.endsAt)).rejects.toThrow('changed');
  await repository.start(10);
  expect((await repository.get())?.cycle).toBeUndefined();
});

it('validates cycle lengths, isolates spaces and rolls back phase transitions', async () => {
  await database.open();
  for (const minutes of [0, 61, 1.5, NaN])
    await expect(repository.start(25, minutes)).rejects.toThrow('break');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
  await repository.start(1, 1);
  const initial = (await repository.get())!;
  clock.mockReturnValue(initial.endsAt);
  await expect(
    createFocusSessionRepository('missing', database).nextPhase(initial.endsAt),
  ).rejects.toThrow('space');
  const fail = () => {
    throw new Error('Storage failed');
  };
  database.focusSessions.hook('updating', fail);
  try {
    await expect(repository.nextPhase(initial.endsAt)).rejects.toThrow(
      'Storage failed',
    );
  } finally {
    database.focusSessions.hook('updating').unsubscribe(fail);
  }
  expect(await repository.get()).toEqual(initial);
});
