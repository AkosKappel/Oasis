import { test, expect } from '@playwright/test';
import { openLibraryFilters, openSettingsPage } from '../e2e/fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        runtime: { id: 'oasis-ui-fixture' },
        permissions: {
          contains: async () => false,
          request: async () => false,
          remove: async () => false,
        },
      },
    });
  });
  await page.goto('/newtab.html');
  await page.getByRole('button', { name: 'Skip setup', exact: true }).click();
});

test('forced colors preserve keyboard focus, button boundaries and native selects', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  expect(
    await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
  ).toBe(true);
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  const add = page.getByRole('button', { name: 'Add bookmark', exact: true });
  await add.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Save a bookmark',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', {
    name: 'Save bookmark',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  const style = await save.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      outline: css.outlineStyle,
      outlineWidth: parseFloat(css.outlineWidth),
      border: css.borderTopStyle,
      borderWidth: parseFloat(css.borderTopWidth),
      outlineColor: css.outlineColor,
      background: css.backgroundColor,
    };
  });
  expect(style.outline).toBe('solid');
  expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(style.outlineColor).not.toBe(style.background);
  expect(style.border).toBe('solid');
  expect(style.borderWidth).toBeGreaterThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath('forced-colors-dialog.png'),
  });
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  await openLibraryFilters(page);
  const collections = page.getByRole('combobox', {
    name: 'Collections',
    exact: true,
  });
  expect(
    await collections.evaluate(
      (element) => getComputedStyle(element).appearance,
    ),
  ).toBe('auto');
  await collections.selectOption('favorites');
  await expect(collections).toHaveValue('favorites');
  const list = page.getByRole('button', { name: 'List view', exact: true });
  await list.click();
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  await collections.focus();
  expect(
    await list.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
  expect(
    await list.evaluate((element) => getComputedStyle(element).outlineOffset),
  ).toBe('-3px');
  await list.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(list).toBeFocused();
  expect(
    await list.evaluate((element) => getComputedStyle(element).outlineWidth),
  ).toBe('2px');
  expect(
    await list.evaluate((element) => getComputedStyle(element).outlineOffset),
  ).toBe('2px');
  await page.screenshot({
    path: testInfo.outputPath('forced-colors-library.png'),
  });
});

test('enlarged text and narrow reflow keep Library and Settings actions reachable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  await title.fill('Readable with enlarged text');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/accessible');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: /Readable with enlarged text/ }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('library-enlarged-text.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(
    page.locator('aside[aria-label="Library navigation"] > details'),
  ).not.toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await openSettingsPage(page, 'General');
  const settings = page.getByRole('dialog', { name: 'General', exact: true });
  await expect(settings).toBeVisible();
  expect(
    await settings.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Close settings', exact: true })
    .click();
  await expect(settings).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('home-narrow-reflow.png'),
    fullPage: true,
  });
});
