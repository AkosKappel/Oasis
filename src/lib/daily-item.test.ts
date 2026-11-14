import { expect, it } from 'vitest';
import { dailyItem } from './daily-item';
const items = [
  { id: 'a', createdAt: 1 },
  { id: 'b', createdAt: 2 },
  { id: 'c', createdAt: 3 },
];
it('uses the local calendar day, is stable across tabs and advances on the next date', () => {
  const morning = dailyItem(items, 'album', new Date(2026, 10, 14, 0, 1));
  expect(
    dailyItem([...items].reverse(), 'album', new Date(2026, 10, 14, 23, 59)),
  ).toEqual(morning);
  expect(dailyItem(items, 'album', new Date(2026, 10, 15))).not.toEqual(
    morning,
  );
  expect(dailyItem([], 'album', new Date())).toBeUndefined();
  expect(dailyItem([items[0]!], 'album', new Date())).toEqual(items[0]);
});
it('advances through year and daylight-saving calendar boundaries', () => {
  for (const [a, b] of [
    [new Date(2026, 11, 31), new Date(2027, 0, 1)],
    [new Date(2026, 2, 29), new Date(2026, 2, 30)],
  ])
    expect(dailyItem(items, 'album', a!)).not.toEqual(
      dailyItem(items, 'album', b!),
    );
});
