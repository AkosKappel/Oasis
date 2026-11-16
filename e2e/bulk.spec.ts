import { openLibraryTool } from './fixtures';
import { test, expect } from './fixtures';
test('bulk moves/tags/deletes visible bookmarks and clears selection after filters change', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [{ ...meta, id: 'folder', name: 'Reading', sortOrder: 1 }],
    tags: [{ ...meta, id: 'tag', name: 'Reference', color: '#336699' }],
    bookmarks: ['First', 'Second'].map((title, index) => ({
      ...meta,
      id: String(index),
      title,
      url: `https://example.com/${index}`,
      tags: [],
      isFavorite: false,
      isPinned: false,
      sortOrder: index,
      openCount: 0,
    })),
  };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'bulk.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Restore complete');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', { name: 'Select bookmarks', exact: true })
    .click();
  const toolbar = page.getByRole('region', { name: 'Bulk actions' });
  await toolbar
    .getByRole('button', { name: 'Select visible', exact: true })
    .click();
  await expect(toolbar.getByRole('status')).toHaveText('Selected: 2');
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('First');
  await expect(toolbar.getByRole('status')).toHaveText('Selected: 0');
  await page.getByRole('searchbox').fill('');
  await toolbar
    .getByRole('button', { name: 'Select visible', exact: true })
    .click();
  await toolbar
    .getByRole('button', { name: 'Move selected', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Move to folder', exact: true })
    .selectOption('folder');
  await page
    .getByRole('button', { name: 'Apply to selected', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Select bookmarks', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Select bookmarks', exact: true })
    .click();
  await toolbar
    .getByRole('button', { name: 'Select visible', exact: true })
    .click();
  await toolbar
    .getByRole('button', { name: 'Tag selected', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Reference', exact: true }).check();
  await page
    .getByRole('button', { name: 'Apply to selected', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Bookmarks', exact: true })
      .getByText('Reference', { exact: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page
    .getByRole('button', { name: 'Select bookmarks', exact: true })
    .click();
  await toolbar
    .getByRole('button', { name: 'Select visible', exact: true })
    .click();
  await page.screenshot({
    path: '/tmp/oasis-previews/bulk-actions.png',
    fullPage: true,
  });
  page.once('dialog', (dialog) => dialog.accept());
  await toolbar
    .getByRole('button', { name: 'Delete selected', exact: true })
    .click();
  await expect(page.getByRole('link', { name: /First/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Second/ })).toHaveCount(0);
});
