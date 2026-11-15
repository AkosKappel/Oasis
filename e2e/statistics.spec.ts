import { test, expect } from './fixtures';
test('shows local statistics, empty states and returns focus after dismissal', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Sample reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const trigger = page.getByRole('button', { name: 'Statistics', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', {
    name: 'Library statistics',
    exact: true,
  });
  await expect(dialog).toContainText('example.com');
  await expect(dialog).toContainText('Open counting is off');
  await expect(dialog.getByRole('meter')).toHaveCount(12);
  await page.screenshot({
    path: testInfo.outputPath('statistics-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('statistics-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
