import { test, expect } from './fixtures';

test('Library dialogs retain keyboard focus and narrow layouts expose named controls', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.keyboard.press('Tab');
  await page
    .getByRole('button', { name: 'Skip to library', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  for (const name of [
    'Add bookmark',
    'Folders and tags',
    'Backup and restore',
    'Find duplicates',
  ]) {
    const trigger = page.getByRole('button', { name, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/\S/);
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    ).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await page.getByRole('button').all()) {
    await expect(button).toHaveAccessibleName(/\S/);
  }
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toBeFocused();
});
