import { test, expect } from './fixtures';

test('opens a quiet home and searches the library', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('heading', { name: 'Oasis home' }),
  ).toBeAttached();
  await expect(page.locator('time')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Favorite bookmarks' }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png') });
  await page
    .getByRole('searchbox', { name: 'Search bookmarks' })
    .fill('example');
  await page.getByRole('searchbox').press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Your library' }),
  ).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('example');
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await expect(page.locator('time')).toBeVisible();
});
