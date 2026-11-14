import type { OasisDatabase } from './schema';
export type StorageIssueKind = 'quota' | 'unavailable' | 'blocked' | 'updated';
export interface StorageHealth {
  issue?: StorageIssueKind;
  retryVersion: number;
  retrying: boolean;
  notice?: string;
}
let state: StorageHealth = { retryVersion: 0, retrying: false };
const listeners = new Set<() => void>();
export const storageHealth = {
  get: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
function publish(next: StorageHealth) {
  state = next;
  for (const listener of listeners) listener();
}
export function storageErrorKind(cause: unknown): StorageIssueKind | undefined {
  const queue: unknown[] = [cause];
  let unavailable = false;
  const visited = new Set<unknown>();
  for (let index = 0; index < queue.length && index < 30; index++) {
    const value = queue[index];
    if (!value || typeof value !== 'object' || visited.has(value)) continue;
    visited.add(value);
    const error = value as {
      name?: string;
      inner?: unknown;
      cause?: unknown;
      failures?: unknown[];
    };
    if (error.name === 'QuotaExceededError') return 'quota';
    if (error.name === 'VersionError') return 'updated';
    if (
      ['DatabaseClosedError', 'OpenFailedError', 'UnknownError'].includes(
        error.name ?? '',
      )
    )
      unavailable = true;
    queue.push(
      error.inner,
      error.cause,
      ...(Array.isArray(error.failures) ? error.failures : []),
    );
  }
  return unavailable ? 'unavailable' : undefined;
}
export function reportStorageIssue(issue: StorageIssueKind) {
  if (
    state.issue === issue ||
    (issue === 'unavailable' &&
      (state.issue === 'blocked' || state.issue === 'updated'))
  )
    return;
  publish({ ...state, issue, notice: undefined });
}
export function reportStorageError(cause: unknown, readFailure = false) {
  const issue =
    storageErrorKind(cause) ?? (readFailure ? 'unavailable' : undefined);
  if (issue) reportStorageIssue(issue);
}
export function storageWriteSucceeded() {
  if (state.issue)
    publish({
      retryVersion: state.retryVersion + 1,
      retrying: false,
      notice: 'Saved successfully. Storage is reachable again.',
    });
}
export function dismissStorageNotice() {
  if (!state.issue) publish({ ...state, notice: undefined });
}
export async function retryStorage(database: OasisDatabase): Promise<void> {
  if (state.retrying) return;
  publish({ ...state, retrying: true, notice: undefined });
  try {
    await database.open();
    const space = await database.transaction('r', database.spaces, () =>
      database.spaces.get('default'),
    );
    if (!space || space.deletedAt !== undefined)
      throw new Error('The Personal space is unavailable.');
    publish({
      retryVersion: state.retryVersion + 1,
      retrying: false,
      notice: 'Storage is reachable. Retry the action that failed.',
    });
  } catch (cause) {
    publish({
      ...state,
      issue: storageErrorKind(cause) ?? state.issue ?? 'unavailable',
      retrying: false,
    });
  }
}
