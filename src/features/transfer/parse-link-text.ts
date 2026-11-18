import { validateBookmark } from '@/database/bookmarks';
import {
  MAX_HTML_BYTES,
  MAX_HTML_ITEMS,
  validateHtmlImport,
  type HtmlImport,
} from '@/database/bookmark-html';
import { parseBookmarkHtml } from './parse-bookmark-html';

interface Found {
  url: string;
  title?: string;
}

const MARKDOWN_LINK = /\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/g;
const URL_PATTERN = /https?:\/\/[^\s<>"'`|]+/g;

function trimUrl(url: string) {
  return url.replace(/[.,;:!?)\]}'"]+$/, '');
}

/** JSON exports (Firefox, Chrome, simple lists) nest links as objects with a url-like field. */
function fromJson(value: unknown, found: Found[]) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) found.push({ url: value });
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) fromJson(item, found);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  const url = [record.url, record.href, record.uri].find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && /^https?:\/\//i.test(candidate),
  );
  if (url) {
    const title = [record.title, record.name].find(
      (candidate): candidate is string => typeof candidate === 'string',
    );
    found.push({ url, title });
  }
  for (const [key, child] of Object.entries(record))
    if (!['url', 'href', 'uri'].includes(key)) fromJson(child, found);
}

function fromAnchors(html: string, found: Found[]) {
  // Template content is inert. Never insert imported markup into the page.
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const anchor of template.content.querySelectorAll('a[href]'))
    found.push({
      url: anchor.getAttribute('href') ?? '',
      title: anchor.textContent ?? undefined,
    });
}

/** Lines of plain URLs, Markdown links, CSV or TSV rows and "url | title" lists. */
function fromLines(text: string, found: Found[]) {
  for (const line of text.split(/\r?\n/)) {
    const markdown = [...line.matchAll(MARKDOWN_LINK)];
    if (markdown.length) {
      for (const [, title, url] of markdown) found.push({ url: url!, title });
      continue;
    }
    const urls = [...line.matchAll(URL_PATTERN)].map((match) =>
      trimUrl(match[0]),
    );
    if (urls.length !== 1) {
      for (const url of urls) found.push({ url });
      continue;
    }
    // The rest of a single-link line is its title, without separators and quotes.
    const title = line
      .replace(urls[0]!, ' ')
      .replace(/^[\s,;|\t*•-]+|[\s,;:.|\t-]+$/g, '')
      .replace(/^"(.*)"$/, '$1')
      .replace(/""/g, '"')
      .trim();
    found.push({ url: urls[0]!, title });
  }
}

/**
 * Reads links from pasted text or a file: browser bookmark HTML, any HTML with
 * links, JSON exports, Markdown, CSV, TSV, "url | title" lists or plain URLs.
 * Links can go into one new or existing top-level folder.
 */
export function parseLinkText(text: string, folderName = ''): HtmlImport {
  if (new TextEncoder().encode(text).byteLength > MAX_HTML_BYTES)
    throw new Error('Import less than 10 MB of links at a time.');
  const trimmed = text.trim();
  const folder = folderName.trim();
  if (/<dl[\s>]/i.test(trimmed) && !folder) return parseBookmarkHtml(trimmed);
  const found: Found[] = [];
  if (/^[[{]/.test(trimmed)) {
    try {
      fromJson(JSON.parse(trimmed), found);
    } catch {
      fromLines(trimmed, found);
    }
  } else if (/<a\s[^>]*href=/i.test(trimmed)) fromAnchors(trimmed, found);
  else fromLines(trimmed, found);
  const plan: HtmlImport = {
    folders: folder ? [{ name: folder }] : [],
    bookmarks: [],
    skipped: 0,
  };
  const seen = new Set<string>();
  for (const item of found) {
    try {
      const url = new URL(item.url.trim()).href;
      if (seen.has(url)) continue;
      seen.add(url);
      const title = item.title?.replace(/\s+/g, ' ').trim().slice(0, 200);
      plan.bookmarks.push({
        input: validateBookmark({
          title: title || new URL(url).hostname,
          url,
          description: '',
          isFavorite: false,
        }),
        folder: folder ? 0 : undefined,
      });
    } catch {
      plan.skipped++;
    }
    if (plan.bookmarks.length + plan.skipped > MAX_HTML_ITEMS)
      throw new Error('Import up to 10,000 links at a time.');
  }
  if (!plan.bookmarks.length)
    throw new Error(
      plan.skipped
        ? 'None of these links can be saved. Use http or https addresses.'
        : 'No links found. Paste addresses that start with http:// or https://.',
    );
  return validateHtmlImport(plan);
}
