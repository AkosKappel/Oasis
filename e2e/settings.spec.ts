import AxeBuilder from '@axe-core/playwright';
import { test, expect, openSettingsPage } from './fixtures';
test('keeps Home quiet and puts clock, privacy and content settings in one dialog', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeVisible();
  for (const name of [
    'Appearance',
    'Widgets',
    'Image albums',
    'Quotes',
    'Layout',
    'Content preferences',
  ])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
      0,
    );
  await openSettingsPage(page, 'General');
  await page
    .getByRole('combobox', { name: 'Clock format', exact: true })
    .selectOption('24');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await openSettingsPage(page, 'Privacy');
  await page
    .getByRole('checkbox', { name: 'Count bookmark opens in Oasis' })
    .check();
  await expect(
    page.getByRole('checkbox', { name: 'Count bookmark opens in Oasis' }),
  ).toBeChecked();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Close settings' }),
  ).toBeEnabled();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettingsPage(page, 'Image albums');
  await expect(
    page.getByRole('dialog', { name: 'Image albums', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="albums-title"]'),
  ).toHaveCSS('position', 'static');
  await expect(
    page.getByRole('combobox', { name: 'Settings section' }),
  ).toHaveValue('albums');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png') });
  await page.keyboard.press('Escape');
  await page.reload();
  await openSettingsPage(page, 'General');
  await expect(
    page.getByRole('combobox', { name: 'Clock format', exact: true }),
  ).toHaveValue('24');
});
