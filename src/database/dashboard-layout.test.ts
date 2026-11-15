import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createDashboardLayoutRepository,
  defaultDashboardItems,
  validateDashboardItems,
} from './dashboard-layout';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('layout-test');
afterEach(() => database.delete());
it('keeps defaults read-only, isolates spaces and rejects stale or foreign updates', async () => {
  await database.open();
  const repository = createDashboardLayoutRepository('default', database);
  const initial = await repository.get();
  expect(await database.dashboardLayouts.count()).toBe(0);
  const items = initial.items.toReversed();
  items[0] = { ...items[0]!, visible: false, width: 'wide' };
  await repository.save(items, 0);
  expect((await repository.get()).items).toEqual(items);
  await expect(repository.save(defaultDashboardItems(), 0)).rejects.toThrow(
    'another tab',
  );
  const work = await createSpaceRepository(database).save('Work');
  expect(
    (await createDashboardLayoutRepository(work, database).get()).items,
  ).toEqual(defaultDashboardItems());
  await database.dashboardLayouts.add({
    ...initial,
    id: `${work}:layout`,
    spaceId: 'default',
  });
  await expect(
    createDashboardLayoutRepository(work, database).save(items, 0),
  ).rejects.toThrow('unavailable');
});
it('rejects missing/duplicate sections and retains the last layout on failed writes', async () => {
  expect(() => validateDashboardItems([])).toThrow('valid');
  const items = defaultDashboardItems();
  items[1] = { ...items[0]! };
  expect(() => validateDashboardItems(items)).toThrow('valid');
  await database.open();
  const repository = createDashboardLayoutRepository('default', database);
  await repository.save(defaultDashboardItems(), 0);
  const saved = await repository.get();
  const fail = () => {
    throw new Error('Quota');
  };
  database.dashboardLayouts.hook('updating', fail);
  try {
    await expect(
      repository.save(saved.items.toReversed(), saved.updatedAt),
    ).rejects.toThrow('Quota');
  } finally {
    database.dashboardLayouts.hook('updating').unsubscribe(fail);
  }
  expect((await repository.get()).items).toEqual(saved.items);
});
