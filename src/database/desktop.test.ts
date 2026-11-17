import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createDesktopRepository,
  DESKTOP_COLUMNS,
  DESKTOP_ROWS,
  freeDesktopCell,
} from './desktop';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';
import { createSpaceRepository } from './spaces';
const database = new OasisDatabase('desktop-test');
const desktop = createDesktopRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
async function link(title: string) {
  return createBookmarkRepository('default', database).save({
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    description: '',
    isFavorite: false,
    tags: [],
  });
}

it('fills free cells in reading order and reports a full desktop', () => {
  expect(freeDesktopCell([])).toEqual({ column: 0, row: 0 });
  expect(
    freeDesktopCell([
      { column: 0, row: 0 },
      { column: 2, row: 0 },
    ]),
  ).toEqual({ column: 1, row: 0 });
  const all = Array.from(
    { length: DESKTOP_COLUMNS * DESKTOP_ROWS },
    (_, i) => ({
      column: i % DESKTOP_COLUMNS,
      row: Math.floor(i / DESKTOP_COLUMNS),
    }),
  );
  expect(freeDesktopCell(all)).toBeUndefined();
});

it('places owned links and folders once, swaps on move and removes with a tombstone', async () => {
  const first = await link('First');
  const second = await link('Second');
  const folder = await createOrganizationRepository(
    'default',
    database,
  ).saveFolder('Work');
  const a = await desktop.add('bookmark', first);
  const b = await desktop.add('bookmark', second);
  const c = await desktop.add('folder', folder);
  await expect(desktop.add('bookmark', first)).rejects.toThrow('already');
  await expect(desktop.add('bookmark', 'missing')).rejects.toThrow(
    'no longer available',
  );
  await expect(desktop.add('folder', first)).rejects.toThrow(
    'no longer available',
  );
  const cell = async (id: string) => {
    const item = (await desktop.list()).find((entry) => entry.id === id)!;
    return [item.column, item.row];
  };
  expect([await cell(a), await cell(b), await cell(c)]).toEqual([
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  await desktop.move(c, 5, 3);
  expect(await cell(c)).toEqual([5, 3]);
  await desktop.move(a, 1, 0);
  expect([await cell(a), await cell(b)]).toEqual([
    [1, 0],
    [0, 0],
  ]);
  await expect(desktop.move(a, DESKTOP_COLUMNS, 0)).rejects.toThrow('inside');
  await expect(desktop.move(a, 0, -1)).rejects.toThrow('inside');
  await desktop.remove(b);
  expect((await desktop.list()).map((item) => item.id).sort()).toEqual(
    [a, c].sort(),
  );
  expect((await database.desktopItems.get(b))?.deletedAt).toBeDefined();
  await expect(desktop.move(b, 0, 0)).rejects.toThrow('changed');
  expect(await desktop.add('bookmark', second)).toBeTypeOf('string');
});

it('keeps spaces apart and refuses a full desktop', async () => {
  const spaces = createSpaceRepository(database);
  const other = await spaces.save('Work');
  const otherDesktop = createDesktopRepository(other, database);
  const first = await link('First');
  const id = await desktop.add('bookmark', first);
  await expect(otherDesktop.add('bookmark', first)).rejects.toThrow(
    'no longer available',
  );
  await expect(otherDesktop.move(id, 1, 1)).rejects.toThrow('changed');
  await expect(otherDesktop.remove(id)).rejects.toThrow('changed');
  expect(await otherDesktop.list()).toEqual([]);
  for (let index = 1; index < DESKTOP_COLUMNS * DESKTOP_ROWS; index++)
    await desktop.add('bookmark', await link(`Link ${index}`));
  await expect(
    desktop.add('bookmark', await link('One too many')),
  ).rejects.toThrow('full');
});
