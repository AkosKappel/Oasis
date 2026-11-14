import { expect, it } from 'vitest';
import { descendantFolderIds, folderOptions, folderPaths } from './folder-tree';
const folders = [
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'reading', name: 'Reading', parentId: 'work' },
  { id: 'articles', name: 'Articles', parentId: 'reading' },
  { id: 'other', name: 'Articles', parentId: 'personal' },
];
it('builds unambiguous paths and includes all descendants', () => {
  expect(folderPaths(folders).get('articles')).toBe(
    'Work / Reading / Articles',
  );
  expect(folderPaths(folders).get('other')).toBe('Personal / Articles');
  expect([...descendantFolderIds(folders, 'work')]).toEqual([
    'work',
    'reading',
    'articles',
  ]);
  expect(folderOptions(folders).map((folder) => folder.path)).toEqual([
    'Personal',
    'Personal / Articles',
    'Work',
    'Work / Reading',
    'Work / Reading / Articles',
  ]);
});
it('terminates defensively for invalid legacy cycles', () => {
  const cycle = [
    { id: 'a', name: 'A', parentId: 'b' },
    { id: 'b', name: 'B', parentId: 'a' },
  ];
  expect(descendantFolderIds(cycle, 'a').size).toBe(2);
  expect(folderPaths(cycle).size).toBe(2);
});
