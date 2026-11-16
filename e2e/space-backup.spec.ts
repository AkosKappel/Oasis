import { openSettingsPage } from './fixtures';
import { openLibraryTool } from './fixtures';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('exports and reviews a complete space, restoring safely into a new space', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Widgets');
  let manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('note');
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Reading ideas');
  await manager
    .getByRole('textbox', { name: /Note text/ })
    .fill('Preserve this private scratchpad.');
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit Reading ideas', exact: true }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Sample guide');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/guide');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openLibraryTool(page, 'Backup and restore');
  const backup = page.getByRole('dialog', {
    name: 'Backup and restore',
    exact: true,
  });
  const downloading = page.waitForEvent('download');
  await backup
    .getByRole('button', { name: 'Download complete space', exact: true })
    .click();
  const file = await downloading;
  const bytes = await readFile((await file.path())!);
  const archive = JSON.parse(bytes.toString());
  expect(archive.tables.homeWidgets[0].text).toBe(
    'Preserve this private scratchpad.',
  );
  expect(archive.tables.bookmarks).toHaveLength(1);
  await backup
    .getByLabel('Choose a complete space backup', { exact: true })
    .setInputFiles({
      name: 'complete-space.json',
      mimeType: 'application/json',
      buffer: bytes,
    });
  await expect(backup.getByText(/Review: 1 bookmarks/)).toBeVisible();
  await backup
    .getByRole('textbox', { name: 'Restored space name', exact: true })
    .fill('Recovered sample');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await backup.screenshot({
    path: testInfo.outputPath('complete-backup-review.png'),
  });
  await backup
    .getByRole('button', { name: 'Restore as new space', exact: true })
    .click();
  await expect(backup.getByRole('status')).toContainText(
    'Complete space restored',
  );
  await backup
    .getByRole('button', { name: 'Open restored space', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page
      .getByRole('combobox', { name: 'Active space' })
      .getByRole('option', { selected: true }),
  ).toHaveText('Recovered sample');
  await expect(page.getByRole('link', { name: /Sample guide/ })).toBeVisible();
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await openSettingsPage(page, 'Widgets');
  manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('button', { name: 'Edit Reading ideas', exact: true })
    .click();
  await expect(manager.getByRole('textbox', { name: /Note text/ })).toHaveValue(
    'Preserve this private scratchpad.',
  );
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Active space' })
    .selectOption('default');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('link', { name: /Sample guide/ })).toBeVisible();
});
