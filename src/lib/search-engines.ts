export type SearchEngine =
  'bookmarks' | 'google' | 'duckduckgo' | 'bing' | 'brave';
export const SEARCH_ENGINES: readonly {
  id: SearchEngine;
  name: string;
  url?: string;
}[] = [
  { id: 'bookmarks', name: 'Bookmarks' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search' },
  { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search' },
];
export function searchEngine(value: SearchEngine | undefined) {
  return SEARCH_ENGINES.find((item) => item.id === value) ?? SEARCH_ENGINES[0]!;
}
export function webSearchUrl(
  engine: SearchEngine | undefined,
  query: string,
): string | undefined {
  const selected = searchEngine(engine),
    term = query.trim();
  if (!selected.url || !term || term.length > 2000) return undefined;
  const url = new URL(selected.url);
  url.searchParams.set('q', term);
  return url.href;
}
