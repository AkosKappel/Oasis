import { openSettingsPage } from './fixtures';
import { test, expect } from './fixtures';
test('open counting requires opt-in, populates smart collections and clears on request', async ({
  page,
  context,
}) => {
  await context.route('https://example.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Example</title><p>Sample destination</p>',
    }),
  );
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const link = page.getByRole('link', {
    name: /Reference.*opens in a new tab/,
  });
  const popupPromise = context.waitForEvent('page');
  await link.click();
  await (await popupPromise).close();
  const collection = page.getByRole('combobox', {
    name: 'Collections',
    exact: true,
  });
  await collection.selectOption('recently-opened');
  await expect(link).toHaveCount(0);
  await collection.selectOption('all');
  await openSettingsPage(page, 'Privacy');
  await page
    .getByRole('checkbox', {
      name: 'Count bookmark opens in Oasis',
      exact: true,
    })
    .check();
  await expect(
    page.getByRole('checkbox', {
      name: 'Count bookmark opens in Oasis',
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const counted = context.waitForEvent('page');
  await link.click();
  await (await counted).close();
  await collection.selectOption('recently-opened');
  await expect(link).toBeVisible();
  await expect(page.getByText('Opened 1 time', { exact: false })).toBeVisible();
  await collection.selectOption('frequently-opened');
  await expect(link).toBeVisible();
  await page.reload();
  await openSettingsPage(page, 'Privacy');
  await expect(
    page.getByRole('checkbox', {
      name: 'Count bookmark opens in Oasis',
      exact: true,
    }),
  ).toBeChecked();
  await page
    .getByRole('checkbox', {
      name: 'Count bookmark opens in Oasis',
      exact: true,
    })
    .uncheck();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Clear open history', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await collection.selectOption('recently-opened');
  await expect(link).toHaveCount(0);
});
