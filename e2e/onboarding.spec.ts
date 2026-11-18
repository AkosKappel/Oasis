import { axe, test, expect, openSettingsPage } from './fixtures';
test.use({ skipSetup: false });
test('offers a skippable first-run setup with persistent clock choices', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  const welcome = page.getByRole('dialog', { name: 'Welcome to Oasis' });
  await expect(welcome).toBeVisible();
  await welcome
    .getByRole('combobox', { name: 'Clock format' })
    .selectOption('24');
  expect(
    (
      await axe(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('welcome.png') });
  await welcome.getByRole('button', { name: 'Start using Oasis' }).click();
  await expect(welcome).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await openSettingsPage(page, 'General');
  await expect(
    page.getByRole('combobox', { name: 'Clock format' }),
  ).toHaveValue('24');
});
test('skips setup without leaving a banner and opens import on request', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page
    .getByRole('button', { name: 'Import bookmarks or a backup' })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Backup and restore', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
});
test('allows Escape to skip setup', async ({ page }) => {
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('dialog', { name: 'Welcome to Oasis' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
