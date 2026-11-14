import { afterEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
const database = new OasisDatabase('oasis-test');
afterEach(async () => {
  await database.delete();
});
it('creates the default space once and preserves it when reopened', async () => {
  await database.open();
  expect(await database.spaces.toArray()).toEqual([
    expect.objectContaining({ id: 'default', name: 'Personal' }),
  ]);
  await database.spaces.update('default', { name: 'Work' });
  database.close();
  await database.open();
  expect(await database.spaces.count()).toBe(1);
  expect((await database.spaces.get('default'))?.name).toBe('Work');
});
