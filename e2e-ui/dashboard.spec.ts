import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import {
  openSettingsPage,
  openLibraryTool,
  openLibraryFilters,
} from '../e2e/fixtures';

test.beforeEach(async ({ page, browser, browserName }, testInfo) => {
  testInfo.annotations.push({
    type: 'engine',
    description: `${browserName} ${browser.version()}`,
  });
  await page.addInitScript(() => {
    // Page tests deny extension permissions; actual extension APIs have their own suite.
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
});

test('onboarding, responsive Library CRUD, dialogs and local persistence work across engines', async ({
  page,
}, testInfo) => {
  await page
    .getByRole('dialog', { name: 'Welcome to Oasis' })
    .getByRole('button', { name: 'Skip setup' })
    .click();
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Engine compatibility guide');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/guide');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const link = page.getByRole('link', { name: /Engine compatibility guide/ });
  await expect(link).toBeVisible();
  await page.reload();
  await expect(link).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  // WebKit can deliver the breakpoint event after setViewportSize resolves.
  await expect(
    page.locator('aside[aria-label="Library navigation"] > details'),
  ).not.toHaveAttribute('open', '');
  await openLibraryFilters(page);
  await expect(
    page.getByRole('combobox', { name: 'Collections', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  await expect(
    page.getByRole('dialog', { name: 'Backup and restore', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'More Library tools', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('button', {
      name: 'Edit Engine compatibility guide',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Updated compatibility guide');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: /Updated compatibility guide/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('library-engine-mobile.png'),
    fullPage: true,
  });
});

test('Home preferences, note editing and task navigation work across engines', async ({
  page,
}, testInfo) => {
  await page
    .getByRole('dialog', { name: 'Welcome to Oasis' })
    .getByRole('combobox', { name: 'Clock format' })
    .selectOption('24');
  await page.getByRole('button', { name: 'Start using Oasis' }).click();
  await openSettingsPage(page, 'General');
  await expect(
    page.getByRole('combobox', { name: 'Clock format' }),
  ).toHaveValue('24');
  await page.keyboard.press('Escape');
  await openSettingsPage(page, 'Widgets');
  const manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('note');
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Ideas');
  await manager
    .getByRole('textbox', { name: /Note text/ })
    .fill('Keep a little space.');
  await manager
    .getByRole('checkbox', { name: 'Show on Home', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit Ideas', exact: true }),
  ).toBeVisible();
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('tasks');
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Today');
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await manager
    .getByRole('button', { name: 'Manage tasks Today', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Task', exact: true })
    .fill('Read a page');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Read a page', exact: true })
    .check();
  await expect(
    page.getByRole('checkbox', { name: 'Read a page', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Close settings', exact: true }),
  ).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(manager).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit note Ideas', exact: true })
    .focus();
  await page
    .getByRole('button', { name: 'Edit note Ideas', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Note text', exact: true })
    .fill('A saved idea.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit Ideas', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Ideas', exact: true }),
  ).toContainText('A saved idea.');
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'Ideas', exact: true }),
  ).toContainText('A saved idea.');
  await page.screenshot({ path: testInfo.outputPath('home-engine.png') });
});

test('reviews a smart-collection query from filters on a narrow layout', async ({
  page,
}) => {
  await page
    .getByRole('dialog', { name: 'Welcome to Oasis' })
    .getByRole('button', { name: 'Skip setup' })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryFilters(page);
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  const manager = page.getByRole('dialog', {
    name: 'Saved searches',
    exact: true,
  });
  await manager
    .getByRole('textbox', { name: 'Search name', exact: true })
    .fill('Favorite references');
  await manager.getByText('Build with filters', { exact: true }).click();
  await manager
    .getByRole('textbox', { name: 'Contains text', exact: true })
    .fill('guide');
  await manager
    .getByRole('textbox', { name: 'Website domain', exact: true })
    .fill('example.com');
  await manager
    .getByRole('checkbox', { name: 'Favorites only', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Apply filters to query', exact: true })
    .click();
  const query = '"guide" domain:example.com is:favorite';
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue(query);
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toBeFocused();
  expect(
    await manager.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await manager
    .getByRole('button', { name: 'Save search', exact: true })
    .click();
  await expect(manager.getByRole('status')).toHaveText('Search saved.');
  await manager
    .getByRole('button', { name: 'Load Favorite references', exact: true })
    .click();
  await expect(
    page.getByRole('searchbox', { name: 'Search bookmarks', exact: true }),
  ).toHaveValue(query);
});
