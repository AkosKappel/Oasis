import { validateBookmark, type BookmarkInput } from '@/database/bookmarks';

export function captureTab(tab?: {
  title?: string;
  url?: string;
}): BookmarkInput {
  if (!tab?.url) throw new Error('Open a website, then click Oasis again.');
  let url: URL;
  try {
    url = new URL(tab.url);
  } catch {
    throw new Error(
      'This page cannot be saved. Open an http:// or https:// website.',
    );
  }
  return validateBookmark({
    title: tab.title?.trim() || url.hostname,
    url: tab.url,
    description: '',
    isFavorite: false,
  });
}
