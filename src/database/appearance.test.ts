import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createAppearanceRepository, defaultAppearance } from './appearance';
const database = new OasisDatabase('oasis-appearance-test');
const repository = createAppearanceRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
it('returns defaults without writing and persists validated preferences', async () => {
  expect(await repository.get()).toEqual(defaultAppearance);
  expect(await database.preferences.count()).toBe(0);
  await repository.save({
    ...defaultAppearance,
    theme: 'dark',
    clock: '24',
    showDate: false,
  });
  const created = (await database.preferences.toArray())[0]!;
  await repository.save({ ...defaultAppearance, accent: 'ocean' });
  expect(await repository.get()).toEqual({
    ...defaultAppearance,
    accent: 'ocean',
  });
  expect(await database.preferences.count()).toBe(1);
  expect((await database.preferences.toArray())[0]?.createdAt).toBe(
    created.createdAt,
  );
});
it('rejects invalid settings and cross-space or deleted preference records', async () => {
  await expect(
    repository.save({ ...defaultAppearance, theme: 'invalid' as 'dark' }),
  ).rejects.toThrow('valid');
  expect(await database.preferences.count()).toBe(0);
  await database.transaction('rw', database.preferences, () =>
    database.preferences.put({
      ...defaultAppearance,
      id: 'default:appearance',
      spaceId: 'other',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(repository.save(defaultAppearance)).rejects.toThrow(
    'unavailable',
  );
  await expect(repository.get()).rejects.toThrow('unavailable');
  await database.transaction('rw', database.preferences, () =>
    database.preferences.update('default:appearance', {
      spaceId: 'default',
      deletedAt: 1,
    }),
  );
  await expect(repository.save(defaultAppearance)).rejects.toThrow(
    'unavailable',
  );
});
