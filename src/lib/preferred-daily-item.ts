import type { ContentFeedback } from '@/database/content-feedback';
import { localDay } from '@/database/daily-focus';
export interface RotationItem {
  id: string;
  group: string;
}
function randomFraction(value: string) {
  let hash = 2166136261;
  for (const character of value)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  // Avalanche adjacent IDs and calendar dates before converting to an open interval.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return ((hash >>> 0) + 1) / 4294967297;
}
export function preferredDailyItem<T extends RotationItem>(
  items: T[],
  feedback: ContentFeedback[],
  seed: string,
  date: Date,
  excludedIds: ReadonlySet<string> = new Set(),
): T | undefined {
  const ratings = new Map(
    feedback
      .filter((record) => record.deletedAt === undefined)
      .map((record) => [record.itemId, record.rating]),
  );
  const likedGroups = new Set(
    items
      .filter((item) => ratings.get(item.id) === 'like' && item.group)
      .map((item) => item.group),
  );
  let selected: T | undefined,
    best = Infinity;
  for (const item of items) {
    if (excludedIds.has(item.id)) continue;
    const rating = ratings.get(item.id);
    if (rating === 'dislike') continue;
    const weight = rating === 'like' ? 8 : likedGroups.has(item.group) ? 2 : 1;
    // A weighted exponential race is deterministic for a local day and independent of input order.
    const score =
      -Math.log(
        randomFraction(JSON.stringify([seed, localDay(date), item.id])),
      ) / weight;
    if (score < best || (score === best && item.id < (selected?.id ?? ''))) {
      best = score;
      selected = item;
    }
  }
  return selected;
}

export function nextPreferredItem<T extends RotationItem>(
  items: T[],
  feedback: ContentFeedback[],
  seed: string,
  date: Date,
  currentId: string,
  seen: string[] = [],
): T | undefined {
  return (
    preferredDailyItem(
      items,
      feedback,
      `${seed}:next:${currentId}`,
      date,
      new Set([currentId, ...seen]),
    ) ??
    preferredDailyItem(
      items,
      feedback,
      `${seed}:next:${currentId}`,
      date,
      new Set([currentId]),
    )
  );
}
