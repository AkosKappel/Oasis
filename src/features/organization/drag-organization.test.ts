import { expect, it } from 'vitest';
import type { DragEvent } from 'react';
import { readOrganizationDrag } from './drag-organization';
function event(value: string) {
  return { dataTransfer: { getData: () => value } } as unknown as DragEvent;
}
it('accepts only Oasis items from the current space and rejects malformed/external payloads', () => {
  expect(
    readOrganizationDrag(
      event(
        JSON.stringify({ kind: 'bookmark', id: 'saved', spaceId: 'default' }),
      ),
      'default',
    ),
  ).toEqual({ kind: 'bookmark', id: 'saved', spaceId: 'default' });
  for (const value of [
    'https://example.com/private',
    'null',
    '{}',
    JSON.stringify({ kind: 'folder', id: 'foreign', spaceId: 'work' }),
    JSON.stringify({ kind: 'url', id: 'saved', spaceId: 'default' }),
  ])
    expect(() => readOrganizationDrag(event(value), 'default')).toThrow(
      'Drag an Oasis item',
    );
});
