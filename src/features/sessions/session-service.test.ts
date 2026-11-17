import { expect, it, vi } from 'vitest';
import type { browser } from 'wxt/browser';
vi.mock('wxt/browser', () => ({ browser: {} }));
import { readWindowTabs, openSession } from './session-service';
it('does not query tabs when optional access is denied', async () => {
  const query = vi.fn();
  const api = {
    permissions: { request: async () => false },
    tabs: { query },
  } as unknown as typeof browser;
  await expect(readWindowTabs(api)).rejects.toThrow('not granted');
  expect(query).not.toHaveBeenCalled();
});
it('opens inactive tabs sequentially, supports cancellation and reports partial failures', async () => {
  const rows = [
    { title: 'One', url: 'https://example.com/1' },
    { title: 'Two', url: 'https://example.com/2' },
  ];
  const cancel = new AbortController();
  const create = vi.fn(async () => ({}));
  const api = { tabs: { create } } as unknown as typeof browser;
  expect(
    await openSession(rows, cancel.signal, () => cancel.abort(), api),
  ).toBe(1);
  expect(create).toHaveBeenCalledExactlyOnceWith({
    url: rows[0]!.url,
    active: false,
  });
  const failed = vi
    .fn()
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('Browser limit'));
  await expect(
    openSession(rows, new AbortController().signal, () => {}, {
      tabs: { create: failed },
    } as unknown as typeof browser),
  ).rejects.toThrow('Opened 1 tabs');
  await expect(
    openSession(
      Array.from({ length: 51 }, () => rows[0]!),
      new AbortController().signal,
      () => {},
      api,
    ),
  ).rejects.toThrow('50');
});
