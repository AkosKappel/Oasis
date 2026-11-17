import type { Bookmark } from '@/types/entities';
export const MAX_CHECK_LINKS = 50;
export const MAX_CHECK_PREVIEW = 200;
export interface CheckLink {
  title: string;
  url: string;
}
export type LinkCheckKind =
  | 'responded'
  | 'not-found'
  | 'restricted'
  | 'redirect'
  | 'unsupported'
  | 'rate-limited'
  | 'server-error'
  | 'unknown'
  | 'no-access'
  | 'timeout'
  | 'network-error';
export interface LinkCheckResult extends CheckLink {
  kind: LinkCheckKind;
  status?: number;
  checkedAt: number;
}
export function linkPermission(value: string) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname ||
    url.hostname.includes('*')
  )
    throw new Error(
      'Only HTTP(S) links without URL credentials can be checked.',
    );
  // Omit ports for Firefox compatibility. Browser host grants cover all paths/ports.
  return `${url.protocol}//${url.hostname}/*`;
}
export function linkCheckPreview(bookmarks: Bookmark[]) {
  const rows = new Map<string, CheckLink>();
  let skipped = 0;
  for (const bookmark of bookmarks) {
    try {
      if (bookmark.deletedAt !== undefined) continue;
      linkPermission(bookmark.url);
      const url = new URL(bookmark.url).href;
      if (!rows.has(url))
        rows.set(url, { title: bookmark.title || new URL(url).hostname, url });
    } catch {
      skipped++;
    }
  }
  return {
    rows: [...rows.values()].slice(0, MAX_CHECK_PREVIEW),
    total: rows.size,
    skipped,
  };
}
export function responseKind(status: number, type: string): LinkCheckKind {
  if (type === 'opaqueredirect' || (status >= 300 && status < 400))
    return 'redirect';
  if (status >= 200 && status < 300) return 'responded';
  if (status === 404 || status === 410) return 'not-found';
  if (status === 401 || status === 403) return 'restricted';
  if (status === 405 || status === 501) return 'unsupported';
  if (status === 429) return 'rate-limited';
  if (status >= 500 && status <= 599) return 'server-error';
  return 'unknown';
}
export function resultLabel(result: Pick<LinkCheckResult, 'kind' | 'status'>) {
  const labels: Record<LinkCheckKind, string> = {
    responded: 'Responded',
    'not-found': 'Not found',
    restricted: 'Login required or access blocked',
    redirect: 'Redirect, not followed',
    unsupported: 'HEAD not supported',
    'rate-limited': 'Rate limited',
    'server-error': 'Server error',
    unknown: 'Inconclusive response',
    'no-access': 'Site access not allowed',
    timeout: 'Timed out',
    'network-error': 'Network or browser blocked the check',
  };
  return labels[result.kind] + (result.status ? ` (${result.status})` : '');
}
