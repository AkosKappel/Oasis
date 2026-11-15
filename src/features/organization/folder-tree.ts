import type { Folder } from '@/types/entities';
type FolderNode = Pick<Folder, 'id' | 'name' | 'parentId'>;

export function folderPaths(folders: FolderNode[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const paths = new Map<string, string>();
  for (const folder of folders) {
    const chain: FolderNode[] = [];
    const visited = new Set<string>();
    let current: FolderNode | undefined = folder;
    while (current && !paths.has(current.id) && !visited.has(current.id)) {
      chain.push(current);
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    let path = current ? (paths.get(current.id) ?? '') : '';
    for (const node of chain.reverse()) {
      path = path ? `${path} / ${node.name}` : node.name;
      paths.set(node.id, path);
    }
  }
  return paths;
}
export function folderOptions<T extends FolderNode & { sortOrder?: number }>(
  folders: T[],
  manual = false,
) {
  const paths = folderPaths(folders);
  if (!manual)
    return folders
      .map((folder) => ({ ...folder, path: paths.get(folder.id)! }))
      .sort((a, b) => a.path.localeCompare(b.path));
  const children = new Map<string, T[]>();
  for (const folder of folders) {
    const key = folder.parentId ?? '';
    const list = children.get(key) ?? [];
    list.push(folder);
    children.set(key, list);
  }
  for (const list of children.values())
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id),
    );
  const result: (T & { path: string })[] = [];
  const visited = new Set<string>();
  const stack = [...(children.get('') ?? [])].reverse();
  while (stack.length) {
    const folder = stack.pop()!;
    if (visited.has(folder.id)) continue;
    visited.add(folder.id);
    result.push({ ...folder, path: paths.get(folder.id)! });
    stack.push(...[...(children.get(folder.id) ?? [])].reverse());
  }
  return result;
}
export function descendantFolderIds(folders: FolderNode[], id: string) {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const siblings = children.get(folder.parentId) ?? [];
    siblings.push(folder.id);
    children.set(folder.parentId, siblings);
  }
  const result = new Set<string>();
  const queue = [id];
  for (let index = 0; index < queue.length; index++) {
    const next = queue[index]!;
    if (result.has(next)) continue;
    result.add(next);
    queue.push(...(children.get(next) ?? []));
  }
  return result;
}
