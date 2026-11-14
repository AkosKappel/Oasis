import { validateBookmark } from '@/database/bookmarks';
import {
  MAX_HTML_BYTES,
  MAX_HTML_ITEMS,
  MAX_HTML_DEPTH,
  validateHtmlImport,
  type HtmlImport,
} from '@/database/bookmark-html';

export function parseBookmarkHtml(html: string): HtmlImport {
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES)
    throw new Error('Choose a bookmark HTML file smaller than 10 MB.');
  let tokens = 0;
  for (const character of html)
    if (character === '<' && ++tokens > 100_000)
      throw new Error(
        'This HTML file is too complex. Import a smaller bookmark file.',
      );
  // Template content is inert. Never insert imported markup into the page.
  const template = document.createElement('template');
  template.innerHTML = html;
  const root = template.content.querySelector('dl');
  if (!root)
    throw new Error(
      'Choose a browser bookmark HTML export containing a bookmark list.',
    );
  const plan: HtmlImport = { folders: [], bookmarks: [], skipped: 0 };
  const lists = new Map<Element, number | undefined>([[root, undefined]]);
  const depths: number[] = [];
  let pending: { index: number; list: Element } | undefined;
  let lastBookmark: { index: number; list: Element } | undefined;
  function date(element: Element) {
    const raw = element.getAttribute('add_date');
    if (!raw || !/^\d+$/.test(raw)) return undefined;
    const milliseconds = Number(raw) * 1000;
    return Number.isSafeInteger(milliseconds) &&
      milliseconds <= 8_640_000_000_000_000
      ? milliseconds
      : undefined;
  }
  for (const element of root.querySelectorAll('dl,h3,a,dd')) {
    const list = element.parentElement?.closest('dl');
    if (!list || !lists.has(list)) continue;
    const parent = lists.get(list);
    switch (element.localName) {
      case 'dl':
        if (!pending || pending.list !== list)
          throw new Error('A nested bookmark list is missing its folder name.');
        lists.set(element, pending.index);
        pending = undefined;
        lastBookmark = undefined;
        break;
      case 'h3': {
        const depth = parent === undefined ? 1 : depths[parent]! + 1;
        if (depth > MAX_HTML_DEPTH)
          throw new Error('Import up to 32 folder levels, or use JSON backup.');
        const index = plan.folders.length;
        plan.folders.push({
          name: element.textContent?.trim() ?? '',
          parent,
          createdAt: date(element),
        });
        depths.push(depth);
        pending = { index, list };
        lastBookmark = undefined;
        break;
      }
      case 'a': {
        pending = undefined;
        lastBookmark = undefined;
        try {
          const url = element.getAttribute('href') ?? '';
          const input = validateBookmark({
            title: element.textContent?.trim() || new URL(url).hostname,
            url,
            description: '',
            isFavorite: false,
          });
          plan.bookmarks.push({
            input,
            folder: parent,
            createdAt: date(element),
          });
          lastBookmark = { index: plan.bookmarks.length - 1, list };
        } catch {
          plan.skipped++;
        }
        break;
      }
      case 'dd':
        if (lastBookmark?.list === list)
          plan.bookmarks[lastBookmark.index]!.input.description =
            element.textContent?.trim() ?? '';
        break;
    }
    if (
      plan.folders.length + plan.bookmarks.length + plan.skipped >
      MAX_HTML_ITEMS
    )
      throw new Error(
        'Import up to 10,000 items at a time, or use JSON backup.',
      );
  }
  return validateHtmlImport(plan);
}
