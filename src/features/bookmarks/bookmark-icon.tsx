import { useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { safeBookmarkMedia } from '@/database/bookmark-media';
import type { Bookmark } from '@/types/entities';

/**
 * Chromium serves favicons from its own local cache to extensions with the
 * favicon permission; nothing is fetched from the site. Firefox has no such
 * API, so it keeps the title initial.
 */
function browserFavicon(url: string) {
  if (import.meta.env.FIREFOX) return;
  try {
    if (!/^https?:$/.test(new URL(url).protocol)) return;
    const icon = new URL(browser.runtime.getURL('/_favicon/' as '/'));
    icon.searchParams.set('pageUrl', url);
    icon.searchParams.set('size', '32');
    return icon.href;
  } catch {
    return undefined;
  }
}

export function BookmarkIcon({
  bookmark,
  large = false,
}: {
  bookmark: Bookmark;
  large?: boolean;
}) {
  const favicon = useMemo(
    () =>
      safeBookmarkMedia(bookmark.favicon, 'icon') ??
      browserFavicon(bookmark.url),
    [bookmark.favicon, bookmark.url],
  );
  const [failed, setFailed] = useState<string>();
  const custom = bookmark.customIcon?.trim();
  const icon =
    custom &&
    custom.length <= 16 &&
    !/\p{Cc}|[\u202a-\u202e\u2066-\u2069]/u.test(custom)
      ? custom
      : undefined;
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded leading-none ${large ? 'size-10 text-xl' : 'size-5 text-sm'}`}
    >
      {!icon && favicon && failed !== favicon ? (
        <img
          src={favicon}
          alt=""
          className="absolute inset-0 size-full object-contain"
          onError={() => setFailed(favicon)}
        />
      ) : (
        (icon ?? Array.from(bookmark.title.trim())[0]?.toUpperCase() ?? '•')
      )}
    </span>
  );
}
