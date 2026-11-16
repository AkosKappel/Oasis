import { openLibraryTool } from './fixtures';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test('core pages and dialogs have no detected WCAG A/AA violations', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const violations: unknown[] = [];
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('chrome://newtab/');
  async function scan(name: string, target: Page = page) {
    const result = await new AxeBuilder({ page: target })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    if (result.violations.length)
      violations.push({
        screen: name,
        violations: result.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target),
        })),
      });
  }
  await scan('Home');
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await scan('Space management');
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  for (const name of [
    'Layout',
    'Appearance',
    'Widgets',
    'Image albums',
    'Quotes',
    'Focus mode',
  ]) {
    if (
      [
        'Statistics',
        'Folders and tags',
        'Backup and restore',
        'Find duplicates',
      ].includes(name)
    )
      await openLibraryTool(page, name);
    else await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await scan(name);
    if (name === 'Widgets') {
      await page
        .getByRole('combobox', { name: 'Widget type', exact: true })
        .selectOption('countdown');
      await scan('Countdown editor');
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await scan('Empty Library');
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await scan('Bookmark editor');
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Accessibility reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await scan('Populated Library');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await scan('Dark Library');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  for (const name of [
    'Statistics',
    'Notes for Accessibility reference',
    'Folders and tags',
    'Backup and restore',
    'Find duplicates',
  ]) {
    if (
      [
        'Statistics',
        'Folders and tags',
        'Backup and restore',
        'Find duplicates',
      ].includes(name)
    )
      await openLibraryTool(page, name);
    else await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await scan(name);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await scan('Command palette');
  await page.keyboard.press('Escape');
  const capture = await context.newPage();
  try {
    await capture.goto(
      `${new URL('/capture.html', page.url()).href}#title=Reference&url=https%3A%2F%2Fexample.com`,
    );
    await expect(
      capture.getByRole('button', { name: 'Save bookmark', exact: true }),
    ).toBeVisible();
    await scan('Capture', capture);
  } finally {
    await capture.close();
  }
  expect(violations).toEqual([]);
});
