export function moveBefore<T extends { id: string; sortOrder: number }>(
  records: T[],
  id: string,
  beforeId: string | null,
): { id: string; sortOrder: number }[] {
  const ordered = [...records].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const source = ordered.find((record) => record.id === id);
  if (
    !source ||
    (beforeId !== null && !ordered.some((record) => record.id === beforeId))
  )
    throw new Error('The item or its destination is unavailable.');
  if (id === beforeId) return [];
  const rest = ordered.filter((record) => record.id !== id);
  const position =
    beforeId === null
      ? rest.length
      : rest.findIndex((record) => record.id === beforeId);
  const previous = rest[position - 1]?.sortOrder,
    next = rest[position]?.sortOrder;
  const rank =
    previous === undefined
      ? next === undefined
        ? 1024
        : next / 2
      : next === undefined
        ? previous + 1
        : previous + (next - previous) / 2;
  if (
    Number.isFinite(rank) &&
    (previous === undefined || rank > previous) &&
    (next === undefined || rank < next)
  )
    return [{ id, sortOrder: rank }];
  // Rebalance only when imported ties or exhausted floating-point gaps prevent a single-record move.
  rest.splice(position, 0, source);
  return rest.flatMap((record, index) => {
    const sortOrder = (index + 1) * 1024;
    return record.sortOrder === sortOrder ? [] : [{ id: record.id, sortOrder }];
  });
}
