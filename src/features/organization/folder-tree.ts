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
export function folderOptions<T extends FolderNode>(folders: T[]) {
  const paths = folderPaths(folders);
  return folders
    .map((folder) => ({ ...folder, path: paths.get(folder.id)! }))
    .sort((a, b) => a.path.localeCompare(b.path));
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
