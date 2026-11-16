import { afterEach, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { OasisDatabase } from './schema';
import { createOnboardingRepository } from './onboarding';
import { defaultAppearance, createAppearanceRepository } from './appearance';
const database = new OasisDatabase('onboarding-test');
afterEach(() => database.delete());
it('starts new profiles with setup available, persists choices atomically and supports skipping', async () => {
  await database.open();
  expect((await database.spaces.get('default'))!.setupComplete).toBeUndefined();
  await expect(
    createOnboardingRepository('default', database).finish({
      ...defaultAppearance,
      clock: 'invalid' as '24',
    }),
  ).rejects.toThrow();
  expect((await database.spaces.get('default'))!.setupComplete).toBeUndefined();
  await createOnboardingRepository('default', database).finish({
    ...defaultAppearance,
    clock: '24',
  });
  expect((await database.spaces.get('default'))!.setupComplete).toBe(true);
  expect(
    (await createAppearanceRepository('default', database).get()).clock,
  ).toBe('24');
  await expect(
    createOnboardingRepository('missing', database).finish(),
  ).rejects.toThrow();
});
it('upgrades existing profiles without showing first-run setup or changing preferences', async () => {
  const old = new Dexie('onboarding-test');
  old
    .version(22)
    .stores({ spaces: 'id, name, updatedAt', preferences: 'id, spaceId' });
  await old.open();
  await old
    .table('spaces')
    .put({ id: 'default', name: 'Personal', createdAt: 1, updatedAt: 1 });
  await old.table('preferences').put({
    ...defaultAppearance,
    clock: '12',
    id: 'default:appearance',
    spaceId: 'default',
    createdAt: 1,
    updatedAt: 1,
  });
  old.close();
  await database.open();
  expect((await database.spaces.get('default'))!.setupComplete).toBe(true);
  expect(
    (await createAppearanceRepository('default', database).get()).clock,
  ).toBe('12');
});

it('rolls back preference writes if marking setup complete fails', async () => {
  await database.open();
  const failure = vi
    .spyOn(database.spaces, 'update')
    .mockRejectedValueOnce(new Error('quota'));
  try {
    await expect(
      createOnboardingRepository('default', database).finish({
        ...defaultAppearance,
        clock: '24',
      }),
    ).rejects.toThrow('quota');
  } finally {
    failure.mockRestore();
  }
  expect(await database.preferences.get('default:appearance')).toBeUndefined();
  expect((await database.spaces.get('default'))!.setupComplete).toBeUndefined();
});
