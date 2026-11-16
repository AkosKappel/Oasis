import { test, expect, openSettingsPage } from './fixtures';
test('undoes bookmark removal and restores it from persistent Trash', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Reading guide');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/guide');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const card = page
    .locator('[data-bookmark-id]')
    .filter({ has: page.getByRole('link', { name: /Reading guide/ }) });
  await card
    .getByRole('button', { name: 'Delete Reading guide', exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole('button', { name: 'Delete Reading guide', exact: true })
    .click();
  await page.reload();
  await openSettingsPage(page, 'Backup and restore');
  await expect(page.getByRole('region', { name: 'Trash' })).toBeVisible();
  await page
    .getByRole('region', { name: 'Trash', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('trash.png') });
  await page
    .getByRole('button', { name: 'Restore Reading guide', exact: true })
    .click();
  await expect(
    page.getByText('Trash is empty.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(card).toBeVisible();
});
