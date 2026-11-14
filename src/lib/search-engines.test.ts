import { expect, it } from 'vitest';
import {
  webSearchUrl,
  searchEngine,
  type SearchEngine,
} from './search-engines';
it('keeps legacy and invalid sources local and ignores empty or oversized web queries', () => {
  expect(searchEngine(undefined).id).toBe('bookmarks');
  expect(webSearchUrl(undefined, 'query')).toBeUndefined();
  expect(webSearchUrl('unknown' as SearchEngine, 'query')).toBeUndefined();
  expect(webSearchUrl('google', '  ')).toBeUndefined();
  expect(webSearchUrl('bing', 'x'.repeat(2001))).toBeUndefined();
});
it('encodes exact queries on allowlisted HTTPS provider destinations', () => {
  const expected = {
    google: 'www.google.com',
    duckduckgo: 'duckduckgo.com',
    bing: 'www.bing.com',
    brave: 'search.brave.com',
  };
  for (const [engine, hostname] of Object.entries(expected)) {
    const query = 'café & calm + focus #1 ?redirect=https://example.com';
    const url = new URL(webSearchUrl(engine as SearchEngine, ` ${query} `)!);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe(hostname);
    expect(url.searchParams.get('q')).toBe(query);
    expect([...url.searchParams]).toHaveLength(1);
    expect(url.hash).toBe('');
  }
});
