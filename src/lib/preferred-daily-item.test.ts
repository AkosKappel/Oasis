import { expect, it } from 'vitest';
import type { ContentFeedback } from '@/database/content-feedback';
import { preferredDailyItem, nextPreferredItem } from './preferred-daily-item';
const items = [
  { id: 'a', group: 'nature' },
  { id: 'b', group: 'nature' },
  { id: 'c', group: 'abstract' },
];
function vote(itemId: string, rating: 'like' | 'dislike'): ContentFeedback {
  return {
    id: itemId,
    itemId,
    kind: 'image',
    spaceId: 'default',
    rating,
    createdAt: 1,
    updatedAt: 1,
  };
}
it('is stable across item order, tabs and times on the same local day', () => {
  const date = new Date(2026, 10, 15, 1);
  expect(preferredDailyItem(items, [], 'album', date)).toEqual(
    preferredDailyItem(
      [...items].reverse(),
      [],
      'album',
      new Date(2026, 10, 15, 23),
    ),
  );
  expect(preferredDailyItem([], [], 'empty', date)).toBeUndefined();
  expect(
    preferredDailyItem(
      items,
      items.map((item) => vote(item.id, 'dislike')),
      'album',
      date,
    ),
  ).toBeUndefined();
});
it('boosts likes and related groups without excluding neutral content', () => {
  const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
  for (let day = 1; day <= 2000; day++) {
    const item = preferredDailyItem(
      items,
      [vote('a', 'like')],
      'album',
      new Date(2026, 0, day),
    );
    counts[item!.id]!++;
  }
  expect(counts.a!).toBeGreaterThan(counts.b! * 2);
  expect(counts.b!).toBeGreaterThan(counts.c! * 1.3);
  expect(counts.c!).toBeGreaterThan(50);
});
it('excludes dislikes, ignores deleted votes and keeps a liked current item selected', () => {
  for (let day = 1; day < 60; day++) {
    const date = new Date(2026, 0, day);
    const current = preferredDailyItem(items, [], 'album', date)!;
    expect(
      preferredDailyItem(items, [vote(current.id, 'like')], 'album', date)?.id,
    ).toBe(current.id);
    expect(
      preferredDailyItem(items, [vote(current.id, 'dislike')], 'album', date)
        ?.id,
    ).not.toBe(current.id);
    expect(
      preferredDailyItem(
        items,
        [{ ...vote(current.id, 'dislike'), deletedAt: 2 }],
        'album',
        date,
      )?.id,
    ).toBe(current.id);
  }
});

it('neutral next visits other eligible items before cycling and leaves feedback unchanged', () => {
  const date = new Date(2026, 10, 16),
    feedback = [vote('c', 'dislike')],
    snapshot = structuredClone(feedback);
  expect(
    nextPreferredItem(items, feedback, 'album', date, 'a', ['a'])?.id,
  ).toBe('b');
  expect(
    nextPreferredItem(items, feedback, 'album', date, 'b', ['a', 'b'])?.id,
  ).toBe('a');
  expect(
    nextPreferredItem([items[0]!], feedback, 'album', date, 'a'),
  ).toBeUndefined();
  expect(
    nextPreferredItem(
      items,
      [...feedback, vote('b', 'dislike')],
      'album',
      date,
      'a',
    ),
  ).toBeUndefined();
  expect(feedback).toEqual(snapshot);
});

it('keeps album affinity when the liked current item is excluded by Next', () => {
  const counts = { b: 0, c: 0 };
  for (let day = 0; day < 1200; day++) {
    const next = nextPreferredItem(
      items,
      [vote('a', 'like')],
      'album',
      new Date(2026, 0, 1 + day),
      'a',
    );
    counts[next!.id as 'b' | 'c']++;
  }
  expect(counts.b).toBeGreaterThan(counts.c * 1.5);
});
