import type { Bookmark, Folder, Tag } from '@/types/entities';

const STOP_WORDS = new Set(
  'the and for with from that this your you are was were have has into about how what when where which who why not but all can its our out use using new get more than then them they their there also just like over'.split(
    ' ',
  ),
);

function words(text: string) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(
    (word) => !STOP_WORDS.has(word),
  );
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Weighted terms: tags, folder and site count more than free text. */
function terms(
  bookmark: Bookmark,
  folders: Map<string, string>,
  tags: Map<string, string>,
) {
  const counts = new Map<string, number>();
  const add = (values: string[], weight: number) => {
    for (const value of values)
      counts.set(value, (counts.get(value) ?? 0) + weight);
  };
  add(words(bookmark.title), 2);
  add(words(bookmark.description ?? ''), 1);
  add(words(bookmark.notes ?? ''), 1);
  add(
    bookmark.tags.flatMap((id) =>
      tags.has(id) ? [`tag:${tags.get(id)}`] : [],
    ),
    3,
  );
  if (bookmark.folderId && folders.has(bookmark.folderId))
    add([`folder:${folders.get(bookmark.folderId)}`], 2);
  const site = host(bookmark.url);
  if (site) add([`site:${site}`], 2);
  return counts;
}

/**
 * Bookmarks most similar to the target by TF-IDF cosine similarity, best first.
 * Local word overlap, not language understanding: synonyms do not match.
 */
export function relatedBookmarks(
  target: Bookmark,
  bookmarks: Bookmark[],
  folders: Folder[],
  tags: Tag[],
  limit = 12,
) {
  const folderNames = new Map(
    folders.map((folder) => [folder.id, folder.name.toLowerCase()]),
  );
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name.toLowerCase()]));
  const active = bookmarks.filter(
    (bookmark) => bookmark.deletedAt === undefined,
  );
  const vectors = new Map(
    active.map((bookmark) => [
      bookmark.id,
      terms(bookmark, folderNames, tagNames),
    ]),
  );
  const documents = new Map<string, number>();
  for (const vector of vectors.values())
    for (const term of vector.keys())
      documents.set(term, (documents.get(term) ?? 0) + 1);
  const weight = (term: string, count: number) =>
    count * Math.log((active.length + 1) / ((documents.get(term) ?? 0) + 1));
  function weighted(vector: Map<string, number>) {
    const result = new Map<string, number>();
    let norm = 0;
    for (const [term, count] of vector) {
      const value = weight(term, count);
      if (value <= 0) continue;
      result.set(term, value);
      norm += value * value;
    }
    return { result, norm: Math.sqrt(norm) };
  }
  const source = weighted(
    vectors.get(target.id) ?? terms(target, folderNames, tagNames),
  );
  if (!source.norm) return [];
  const scored: { bookmark: Bookmark; score: number }[] = [];
  for (const bookmark of active) {
    if (bookmark.id === target.id || bookmark.url === target.url) continue;
    const other = weighted(vectors.get(bookmark.id)!);
    if (!other.norm) continue;
    let dot = 0;
    for (const [term, value] of source.result)
      dot += value * (other.result.get(term) ?? 0);
    if (dot > 0)
      scored.push({ bookmark, score: dot / (source.norm * other.norm) });
  }
  return scored
    .sort(
      (a, b) => b.score - a.score || a.bookmark.id.localeCompare(b.bookmark.id),
    )
    .slice(0, limit)
    .map((entry) => entry.bookmark);
}
