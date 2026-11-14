import { afterEach, expect, it, vi } from 'vitest';
import { OasisDatabase } from './schema';
import {
  storageErrorKind,
  storageHealth,
  reportStorageError,
  reportStorageIssue,
  retryStorage,
  storageWriteSucceeded,
  dismissStorageNotice,
} from './storage-health';
afterEach(() => {
  storageWriteSucceeded();
  dismissStorageNotice();
  vi.restoreAllMocks();
});
it('recognizes nested quota errors without misclassifying validation or image errors', () => {
  expect(storageErrorKind(new DOMException('full', 'QuotaExceededError'))).toBe(
    'quota',
  );
  expect(
    storageErrorKind({
      name: 'BulkError',
      failures: [new DOMException('full', 'QuotaExceededError')],
    }),
  ).toBe('quota');
  expect(
    storageErrorKind({
      name: 'OpenFailedError',
      inner: { name: 'QuotaExceededError' },
    }),
  ).toBe('quota');
  expect(storageErrorKind({ name: 'VersionError' })).toBe('updated');
  expect(storageErrorKind(new Error('Enter a title'))).toBeUndefined();
  expect(
    storageErrorKind(new DOMException('image decode', 'InvalidStateError')),
  ).toBeUndefined();
});
it('deduplicates repeated reports and keeps specific upgrade guidance', () => {
  const listener = vi.fn();
  const unsubscribe = storageHealth.subscribe(listener);
  reportStorageIssue('blocked');
  reportStorageIssue('blocked');
  reportStorageError(new Error('read failed'), true);
  expect(storageHealth.get().issue).toBe('blocked');
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});
it('reopens a closed database without deleting saved data and signals query retries', async () => {
  const database = new OasisDatabase('recovery-test');
  try {
    await database.open();
    const before = await database.spaces.get('default');
    database.close();
    reportStorageIssue('unavailable');
    const version = storageHealth.get().retryVersion;
    await retryStorage(database);
    expect(storageHealth.get().issue).toBeUndefined();
    expect(storageHealth.get().retryVersion).toBe(version + 1);
    expect(await database.spaces.get('default')).toEqual(before);
  } finally {
    await database.delete();
  }
});
it('leaves data and warning intact after a failed retry, then recovers', async () => {
  const database = new OasisDatabase('recovery-failure-test');
  try {
    await database.open();
    const get = vi
      .spyOn(database.spaces, 'get')
      .mockRejectedValueOnce(new DOMException('unavailable', 'UnknownError'));
    reportStorageIssue('unavailable');
    await retryStorage(database);
    expect(storageHealth.get().issue).toBe('unavailable');
    expect(storageHealth.get().retrying).toBe(false);
    get.mockRestore();
    await retryStorage(database);
    expect(storageHealth.get().issue).toBeUndefined();
    expect(await database.spaces.count()).toBe(1);
  } finally {
    await database.delete();
  }
});
