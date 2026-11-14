import {
  descendantFolderIds,
  folderPaths,
} from '@/features/organization/folder-tree';
import type { Bookmark, Folder, Tag } from '@/types/entities';

type SearchField = 'tag' | 'folder' | 'domain' | 'is';
interface Term {
  field?: SearchField;
  value: string;
  quoted: boolean;
}
const normalize = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

function terms(query: string): Term[] {
  return (query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((raw) => {
    const operator = /^(tag|folder|domain|is):(.*)$/i.exec(raw);
    const value = operator ? operator[2]! : raw;
    return {
      field: operator?.[1]?.toLowerCase() as SearchField | undefined,
      value: normalize(value.replace(/"/g, '')),
      quoted: value.includes('"'),
    };
  });
}

// Bounded word edits include adjacent transpositions. Longer terms use substring matching.
function edits(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let beforePrevious = previous;
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    let minimum = row;
    for (let column = 1; column <= right.length; column++) {
      let distance = Math.min(
        current[column - 1]! + 1,
        previous[column]! + 1,
        previous[column - 1]! + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      )
        distance = Math.min(distance, beforePrevious[column - 2]! + 1);
      current[column] = distance;
      minimum = Math.min(minimum, distance);
    }
    if (minimum > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length]!;
}

export function createBookmarkSearch(
  query: string,
  folders: Folder[],
  tags: Tag[],
) {
  const parsed = terms(query);
  const textTerms = parsed
    .filter((term) => !term.field && term.value)
    .map((term) => ({ ...term, distances: new Map<string, number>() }));
  const operators = parsed.filter((term) => term.field);
  const paths = folderPaths(folders);
  const folderNames = new Map(
    folders.map((folder) => [folder.id, normalize(paths.get(folder.id)!)]),
  );
  const folderMatches = new Map<string, Set<string>>();
  for (const term of operators.filter((term) => term.field === 'folder')) {
    const ids = new Set<string>();
    for (const folder of folders) {
      if (
        normalize(folder.name) === term.value ||
        folderNames.get(folder.id) === term.value
      ) {
        for (const id of descendantFolderIds(folders, folder.id)) ids.add(id);
      }
    }
    folderMatches.set(term.value, ids);
  }
  const tagNames = new Map(tags.map((tag) => [tag.id, normalize(tag.name)]));
  const normalized = new Map<string, string>();
  const wordLists = new Map<string, string[]>();
  function cachedNormalize(value: string) {
    let result = normalized.get(value);
    if (result === undefined) {
      result = normalize(value);
      normalized.set(value, result);
    }
    return result;
  }
  return (bookmark: Bookmark): number | undefined => {
    for (const term of operators) {
      if (!term.value) return;
      if (
        term.field === 'tag' &&
        !bookmark.tags.some((id) => tagNames.get(id) === term.value)
      )
        return;
      if (
        term.field === 'folder' &&
        !folderMatches.get(term.value)?.has(bookmark.folderId ?? '')
      )
        return;
      if (
        term.field === 'is' &&
        (term.value !== 'favorite' || !bookmark.isFavorite)
      )
        return;
      if (term.field === 'domain') {
        let host: string;
        try {
          host = new URL(bookmark.url).hostname.toLowerCase();
        } catch {
          return;
        }
        if (host !== term.value && !host.endsWith(`.${term.value}`)) return;
      }
    }
    if (!textTerms.length) return 0;
    const fields = [
      bookmark.title,
      bookmark.url,
      bookmark.description ?? '',
      bookmark.notes ?? '',
      folderNames.get(bookmark.folderId ?? '') ?? '',
      ...bookmark.tags.map((id) => tagNames.get(id) ?? ''),
    ].map((value, index) => ({
      value: cachedNormalize(value),
      weight: index === 0 ? 0 : index === 1 ? 15 : 25,
      words: undefined as string[] | undefined,
    }));
    let score =
      fields[0]!.value === textTerms.map((term) => term.value).join(' ')
        ? -100
        : 0;
    for (const term of textTerms) {
      let best = Infinity;
      for (const field of fields) {
        if (field.value.includes(term.value)) {
          best = Math.min(
            best,
            field.weight +
              (field.value === term.value
                ? 0
                : field.value.startsWith(term.value)
                  ? 5
                  : 10),
          );
        }
      }
      if (
        best === Infinity &&
        !term.quoted &&
        term.value.length >= 4 &&
        term.value.length <= 64
      ) {
        const limit = term.value.length >= 8 ? 2 : 1;
        for (const field of fields) {
          if (best <= 110 + field.weight) continue;
          field.words = wordLists.get(field.value);
          if (!field.words) {
            field.words = field.value.match(/[\p{L}\p{N}]+/gu) ?? [];
            wordLists.set(field.value, field.words);
          }
          for (const word of field.words) {
            if (Math.abs(word.length - term.value.length) > limit) continue;
            let distance = term.distances.get(word);
            if (distance === undefined) {
              distance = edits(term.value, word, limit);
              term.distances.set(word, distance);
            }
            if (distance <= limit)
              best = Math.min(best, 100 + distance * 10 + field.weight);
          }
        }
      }
      if (best === Infinity) return;
      score += best;
    }
    return score;
  };
}
