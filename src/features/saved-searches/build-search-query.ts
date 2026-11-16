import type { Folder, Tag } from '@/types/entities';
import { folderPaths } from '@/features/organization/folder-tree';
export interface QueryFilters {
  text: string;
  domain: string;
  folderId: string;
  tagId: string;
  favoritesOnly: boolean;
}
export const emptyQueryFilters: QueryFilters = {
  text: '',
  domain: '',
  folderId: '',
  tagId: '',
  favoritesOnly: false,
};
function phrase(value: string) {
  // The query grammar needs escape support before literal quotes can be accepted.
  if (value.includes('"'))
    throw new Error(
      'Remove double quotes from filter values before building a query.',
    );
  return `"${value}"`;
}
export function buildSearchQuery(
  filters: QueryFilters,
  folders: Pick<Folder, 'id' | 'name' | 'parentId'>[],
  tags: Pick<Tag, 'id' | 'name'>[],
) {
  const parts: string[] = [];
  if (filters.text.trim()) parts.push(phrase(filters.text.trim()));
  if (filters.domain.trim()) {
    let url: URL;
    try {
      url = new URL(
        filters.domain.includes('://')
          ? filters.domain.trim()
          : `https://${filters.domain.trim()}`,
      );
    } catch {
      throw new Error('Enter a website domain, such as example.com.');
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('Use a domain without a path, port or sign-in details.');
    parts.push(`domain:${url.hostname}`);
  }
  if (filters.folderId) {
    const path = folderPaths(folders).get(filters.folderId);
    if (!path) throw new Error('Choose an available folder.');
    parts.push(`folder:${phrase(path)}`);
  }
  if (filters.tagId) {
    const tag = tags.find((tag) => tag.id === filters.tagId);
    if (!tag) throw new Error('Choose an available tag.');
    parts.push(`tag:${phrase(tag.name)}`);
  }
  if (filters.favoritesOnly) parts.push('is:favorite');
  const query = parts.join(' ');
  if (!query) throw new Error('Choose at least one filter.');
  if (query.length > 1000)
    throw new Error('Keep the built query within 1,000 characters.');
  return query;
}
