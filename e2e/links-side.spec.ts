import { test, expect } from './fixtures';

test('places Links on either side and optionally pins folders on desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Links side', exact: true })
    .selectOption('right');
  await page
    .getByRole('checkbox', { name: 'Keep Links open on desktop', exact: true })
    .check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  const sidebar = page.getByRole('complementary', {
    name: 'Links',
    exact: true,
  });
  await expect(sidebar).toBeVisible();
  expect(
    await sidebar.evaluate(
      (element) => element.getBoundingClientRect().left > innerWidth / 2,
    ),
  ).toBe(true);
  await page.locator('main time').click();
  await expect(sidebar).toBeVisible();
  await page.reload();
  await expect(sidebar).toBeVisible();
  await page.screenshot({ path: '/tmp/oasis-previews/links-right-pinned.png' });
  await sidebar
    .getByRole('button', { name: 'Unpin Links', exact: true })
    .click();
  await expect(sidebar).toHaveCount(0);
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Links', exact: true });
  await expect(panel).toBeVisible();
  expect(
    await panel.evaluate(
      (element) => element.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  expect(
    await panel.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }),
  ).toBe(true);
});
