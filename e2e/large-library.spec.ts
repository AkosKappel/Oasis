import { openLibraryTool } from './fixtures';
import { test, expect } from './fixtures';

test('large collections render in bounded batches and remain searchable', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [],
    tags: [],
    bookmarks: Array.from({ length: 10_000 }, (_, index) => ({
      ...meta,
      id: `large-${index}`,
      title: `Reference ${index}`,
      url: `https://example.com/${index}`,
      description: 'Documentation and useful resources',
      notes: index === 9999 ? 'Unique zephyr note' : '',
      tags: [],
      isFavorite: index % 10 === 0,
      isPinned: false,
      sortOrder: index,
      openCount: 0,
    })),
  };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const start = performance.now();
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Restore complete',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const items = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .locator(':scope > li');
  await expect(items).toHaveCount(60);
  const restoreMs = performance.now() - start;
  await page
    .getByRole('button', { name: 'Show more bookmarks', exact: true })
    .click();
  await expect(items).toHaveCount(120);
  const searchStart = performance.now();
  await page.getByRole('searchbox').fill('"Unique zephyr note"');
  await expect(items).toHaveCount(1);
  await expect(items).toContainText('Reference 9999');
  const searchMs = performance.now() - searchStart;
  await page.getByRole('searchbox').clear();
  await expect(items).toHaveCount(60);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(items).toHaveCount(60);
  await testInfo.attach('large-library-timing', {
    body: JSON.stringify({
      records: 10_000,
      restoreAndRenderMs: Math.round(restoreMs),
      exactNoteSearchMs: Math.round(searchMs),
    }),
    contentType: 'application/json',
  });
  console.log(JSON.stringify({ restoreMs, searchMs }));
});
