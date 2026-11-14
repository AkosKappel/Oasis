export function dailyItem<T extends { id: string; createdAt: number }>(
  items: T[],
  seed: string,
  date: Date,
): T | undefined {
  if (!items.length) return undefined;
  const ordered = [...items].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  let offset = 0;
  for (const character of seed)
    offset = (offset * 31 + character.charCodeAt(0)) >>> 0;
  return ordered[
    (((day + offset) % ordered.length) + ordered.length) % ordered.length
  ];
}
