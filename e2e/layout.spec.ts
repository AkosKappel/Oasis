import { openSettingsPage } from './fixtures';
import { test, expect } from './fixtures';
test('saves section order, visibility and width across tabs and resets only the layout', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Home layout');
  const dialog = page.getByRole('dialog', { name: 'Home layout', exact: true });
  await dialog
    .getByRole('button', { name: 'Move up: Search', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('position 1');
  await dialog
    .getByRole('checkbox', { name: 'Show Clock and date', exact: true })
    .uncheck();
  await dialog
    .getByRole('combobox', { name: 'Search width', exact: true })
    .selectOption('wide');
  await dialog
    .getByRole('button', { name: 'Save layout', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-home-section="clock"]')).toHaveCount(0);
  await expect(page.locator('[data-home-section]').first()).toHaveAttribute(
    'data-home-section',
    'search',
  );
  await expect(page.locator('[data-home-section="search"]')).toHaveClass(
    /max-w-4xl/,
  );
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator('[data-home-section="clock"]')).toHaveCount(0);
  await other.close();
  await page.reload();
  await expect(page.locator('[data-home-section="clock"]')).toHaveCount(0);
  await openSettingsPage(page, 'Home layout');
  await page.screenshot({ path: testInfo.outputPath('layout-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('layout-mobile.png') });
  await dialog
    .getByRole('button', { name: 'Reset layout', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Save layout', exact: true })
    .click();
  await expect(page.locator('[data-home-section="clock"]')).toBeVisible();
  await expect(page.locator('[data-home-section]').first()).toHaveAttribute(
    'data-home-section',
    'clock',
  );
});
