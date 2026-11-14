import { test, expect } from './fixtures';

test('sorts a compact library and synchronizes preferences across reloads and tabs', async ({
  page,
  context,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  for (const title of ['Zebra reference', 'Alpha resource', 'Resource 2']) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await page
      .getByRole('textbox', { name: 'URL', exact: true })
      .fill(`https://example.com/${encodeURIComponent(title)}`);
    await page
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(
      page.getByRole('link', { name: new RegExp(title) }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'List view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('name-asc');
  const rows = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .getByRole('listitem');
  await expect(rows.first()).toContainText('Alpha resource');
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(
    second.getByRole('button', { name: 'List view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    second.getByRole('combobox', { name: 'Sort by', exact: true }),
  ).toHaveValue('name-asc');
  await page.reload();
  await expect(rows.first()).toContainText('Alpha resource');
  await page.screenshot({
    path: '/tmp/oasis-previews/library-list.png',
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('name-desc');
  await expect(rows.first()).toContainText('Zebra reference');
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('oldest');
  await expect(rows.first()).toContainText('Zebra reference');
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('newest');
  await expect(rows.first()).toContainText('Resource 2');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '/tmp/oasis-previews/library-list-mobile.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Edit Resource 2', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Edited resource');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: /Edited resource/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Grid view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await second.close();
});
