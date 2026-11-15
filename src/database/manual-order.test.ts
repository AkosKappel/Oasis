import { expect, it } from 'vitest';
import { moveBefore } from './manual-order';
it('changes one rank when a gap exists and leaves input records untouched', () => {
  const records = [
    { id: 'a', sortOrder: 10 },
    { id: 'b', sortOrder: 20 },
    { id: 'c', sortOrder: 30 },
  ];
  expect(moveBefore(records, 'c', 'b')).toEqual([{ id: 'c', sortOrder: 15 }]);
  expect(moveBefore(records, 'a', null)).toEqual([{ id: 'a', sortOrder: 31 }]);
  expect(records[2]?.sortOrder).toBe(30);
  expect(moveBefore(records, 'a', 'a')).toEqual([]);
  expect(() => moveBefore(records, 'missing', 'b')).toThrow('unavailable');
});
it('rebalances tied imported ranks without dropping any records', () => {
  const records = ['a', 'b', 'c'].map((id) => ({ id, sortOrder: 1 }));
  const changes = new Map(
    moveBefore(records, 'c', 'b').map((record) => [
      record.id,
      record.sortOrder,
    ]),
  );
  expect(
    records
      .map((record) => ({
        ...record,
        sortOrder: changes.get(record.id) ?? record.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((record) => record.id),
  ).toEqual(['a', 'c', 'b']);
});
