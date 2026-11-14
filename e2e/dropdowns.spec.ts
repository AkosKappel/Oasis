import { test, expect } from './fixtures';

test('styles native dropdown arrows and options with themed keyboard selection', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  expect(
    await page.evaluate(() => CSS.supports('appearance', 'base-select')),
  ).toBe(true);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(theme).toHaveCSS('appearance', 'base-select');
  await theme.click();
  await expect(
    page.getByRole('option', { name: 'Dark', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '/tmp/oasis-previews/dropdown-light.png' });
  await page.getByRole('option', { name: 'Dark', exact: true }).click();
  await expect(theme).toHaveValue('dark');
  await theme.focus();
  await theme.press('Enter');
  await expect(
    page.getByRole('option', { name: 'Dark', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(theme).toHaveValue('light');
  await theme.selectOption('dark');
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click();
  await page.screenshot({ path: '/tmp/oasis-previews/dropdown-dark.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save settings' }).click();
});
