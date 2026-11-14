import { test, expect } from './fixtures';
test('reviews matching URLs, changes the keeper and confirms selected deletions', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  for (const [title, url] of [
    ['First', 'https://example.com/article'],
    ['Second', 'https://example.com/article'],
    ['Different page', 'https://example.com/article?view=print'],
  ]) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title!);
    await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url!);
    await page
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page
    .getByRole('button', { name: 'Find duplicates', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Review duplicates',
    exact: true,
  });
  await expect(dialog).toContainText('1 matching URL group');
  await dialog
    .getByRole('combobox', { name: 'Keep bookmark', exact: true })
    .selectOption({ label: 'Second (Unorganized)' });
  await expect(
    dialog.getByRole('checkbox', { name: 'Remove copy Second', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('checkbox', { name: 'Remove copy First', exact: true })
    .check();
  await page.screenshot({ path: testInfo.outputPath('duplicate-review.png') });
  page.once('dialog', (confirmation) => confirmation.dismiss());
  await dialog
    .getByRole('button', { name: 'Delete selected copies', exact: true })
    .click();
  await expect(
    dialog.getByRole('checkbox', { name: 'Remove copy First', exact: true }),
  ).toBeChecked();
  page.once('dialog', (confirmation) => confirmation.accept());
  await dialog
    .getByRole('button', { name: 'Delete selected copies', exact: true })
    .click();
  await expect(dialog).toContainText('No duplicate URLs found');
  await expect(
    dialog.getByRole('button', { name: 'Done', exact: true }),
  ).toBeFocused();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('link', { name: /Open First/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Second/ })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Different page/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /Second/ })).toBeVisible();
});
