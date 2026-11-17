import { expect, it, vi } from 'vitest';
import type { browser } from 'wxt/browser';
vi.mock('wxt/browser', () => ({ browser: {} }));
import { checkLinks } from './check-links';
const rows = [
  { title: 'One', url: 'https://example.com/one' },
  { title: 'Two', url: 'https://example.com/two' },
];
const api = (contains = async () => true) =>
  ({ permissions: { contains } }) as unknown as typeof browser;
it('never fetches without permission, rechecks revocation, and uses credential-free HEAD without redirects', async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
  const results: string[] = [];
  await checkLinks(
    rows,
    new AbortController().signal,
    (result) => results.push(result.kind),
    {
      api: api(vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false)),
      fetcher,
      interval: 0,
    },
  );
  expect(results).toEqual(['responded', 'no-access']);
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    rows[0]!.url,
    expect.objectContaining({
      method: 'HEAD',
      credentials: 'omit',
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    }),
  );
});
it('runs one request at a time and stops on rate limits without retrying', async () => {
  let running = 0,
    peak = 0;
  const fetcher = vi.fn(async () => {
    running++;
    peak = Math.max(peak, running);
    await Promise.resolve();
    running--;
    return new Response(null, { status: 429 });
  });
  const results: string[] = [];
  expect(
    await checkLinks(
      rows,
      new AbortController().signal,
      (row) => results.push(row.kind),
      { api: api(), fetcher, interval: 0 },
    ),
  ).toEqual({ completed: 1, stopped: true });
  expect(peak).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(results).toEqual(['rate-limited']);
});
it('aborts in-flight requests, times out and preserves only completed results', async () => {
  const fetcher = vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        init!.signal!.addEventListener('abort', abort, { once: true });
        if (init!.signal!.aborted) abort();
      }),
  );
  const cancel = new AbortController();
  const results: string[] = [];
  const pending = checkLinks(
    rows,
    cancel.signal,
    (row) => results.push(row.kind),
    { api: api(), fetcher, interval: 0 },
  );
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  cancel.abort();
  expect(await pending).toEqual({ completed: 0, stopped: true });
  expect(results).toEqual([]);
  await checkLinks(
    rows.slice(0, 1),
    new AbortController().signal,
    (row) => results.push(row.kind),
    { api: api(), fetcher, timeout: 5, interval: 0 },
  );
  expect(results).toEqual(['timeout']);
});
it('rejects oversized or unsafe batches before any request and reports network failures conservatively', async () => {
  const fetcher = vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  });
  const options = { api: api(), fetcher, interval: 0 };
  await expect(
    checkLinks(
      [...rows, { title: 'Unsafe', url: 'https://*/' }],
      new AbortController().signal,
      () => {},
      options,
    ),
  ).rejects.toThrow('HTTP');
  await expect(
    checkLinks(
      Array.from({ length: 51 }, () => rows[0]!),
      new AbortController().signal,
      () => {},
      options,
    ),
  ).rejects.toThrow('50');
  expect(fetcher).not.toHaveBeenCalled();
  const results: string[] = [];
  await checkLinks(
    rows.slice(0, 1),
    new AbortController().signal,
    (row) => results.push(row.kind),
    options,
  );
  expect(results).toEqual(['network-error']);
});
