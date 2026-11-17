import { browser } from 'wxt/browser';
import {
  linkPermission,
  MAX_CHECK_LINKS,
  responseKind,
  type CheckLink,
  type LinkCheckResult,
} from './link-checks';
function pause(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });
}
export async function checkLinks(
  rows: CheckLink[],
  signal: AbortSignal,
  onResult: (result: LinkCheckResult) => void,
  {
    api = browser,
    fetcher = fetch,
    interval = 500,
    timeout = 8000,
  }: {
    api?: typeof browser;
    fetcher?: typeof fetch;
    interval?: number;
    timeout?: number;
  } = {},
) {
  if (!rows.length || rows.length > MAX_CHECK_LINKS)
    throw new Error('Select between 1 and 50 links.');
  const patterns = rows.map((row) => linkPermission(row.url));
  let completed = 0;
  for (let index = 0; index < rows.length; index++) {
    if (index) await pause(interval, signal);
    if (signal.aborted) break;
    const row = rows[index]!;
    let result: Omit<LinkCheckResult, 'title' | 'url' | 'checkedAt'>;
    const deadline = AbortSignal.timeout(timeout);
    try {
      if (!(await api.permissions.contains({ origins: [patterns[index]!] })))
        result = { kind: 'no-access' };
      else {
        if (signal.aborted) break;
        const response = await fetcher(row.url, {
          method: 'HEAD',
          redirect: 'manual',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
          signal: AbortSignal.any([signal, deadline]),
        });
        result = {
          kind: responseKind(response.status, response.type),
          ...(response.status ? { status: response.status } : {}),
        };
      }
    } catch {
      if (signal.aborted) break;
      result = { kind: deadline.aborted ? 'timeout' : 'network-error' };
    }
    if (signal.aborted) break;
    onResult({ ...row, ...result, checkedAt: Date.now() });
    completed++;
    if (result.kind === 'rate-limited') break;
  }
  return { completed, stopped: signal.aborted || completed < rows.length };
}
