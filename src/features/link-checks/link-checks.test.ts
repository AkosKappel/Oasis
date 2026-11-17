import { expect, it } from 'vitest';
import type { Bookmark } from '@/types/entities';
import {
  linkPermission,
  linkCheckPreview,
  responseKind,
  resultLabel,
} from './link-checks';
it('requests exact scheme/host patterns, never arbitrary wildcard or credential grants', () => {
  expect(linkPermission('https://EXAMPLE.com:8443/path?q=private#note')).toBe(
    'https://example.com/*',
  );
  expect(linkPermission('http://sub.example.com/')).toBe(
    'http://sub.example.com/*',
  );
  for (const url of [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://user:secret@example.com',
    'https://*/',
    'https://*.example.com/',
  ])
    expect(() => linkPermission(url)).toThrow();
});
it('deduplicates URLs, excludes tombstones and bounds the preview without changing input', () => {
  const bookmarks = [
    { id: 'a', title: 'One', url: 'https://example.com' },
    { id: 'b', title: 'Copy', url: 'https://example.com/' },
    { id: 'c', title: 'Deleted', url: 'https://gone.example', deletedAt: 1 },
    { id: 'd', title: 'Unsafe', url: 'https://*/' },
  ] as Bookmark[];
  expect(linkCheckPreview(bookmarks)).toEqual({
    rows: [{ title: 'One', url: 'https://example.com/' }],
    total: 1,
    skipped: 1,
  });
  expect(bookmarks[0]!.url).toBe('https://example.com');
  const large = linkCheckPreview(
    Array.from(
      { length: 205 },
      (_, index) =>
        ({ title: 'Link', url: `https://example.com/${index}` }) as Bookmark,
    ),
  );
  expect(large.rows).toHaveLength(200);
  expect(large.total).toBe(205);
});
it('keeps missing pages separate from redirects, login walls and inconclusive results', () => {
  for (const [status, kind] of [
    [200, 'responded'],
    [204, 'responded'],
    [404, 'not-found'],
    [410, 'not-found'],
    [401, 'restricted'],
    [403, 'restricted'],
    [405, 'unsupported'],
    [501, 'unsupported'],
    [429, 'rate-limited'],
    [503, 'server-error'],
    [301, 'redirect'],
    [418, 'unknown'],
  ] as const)
    expect(responseKind(status, 'basic')).toBe(kind);
  expect(responseKind(0, 'opaqueredirect')).toBe('redirect');
  expect(responseKind(0, 'opaque')).toBe('unknown');
  expect(resultLabel({ kind: 'not-found', status: 404 })).toBe(
    'Not found (404)',
  );
});
