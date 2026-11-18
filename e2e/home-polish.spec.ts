import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, test, expect, settleTransitions } from './fixtures';

test('imports pasted links and adds a link from the Links panel', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Import links');
  const dialog = page.getByRole('dialog', { name: 'Import links' });
  await dialog
    .getByLabel('Links', { exact: true })
    .fill(
      'https://a.example/ | Alpha\n[Beta](https://b.example/)\njavascript:void(0)',
    );
  await dialog.getByLabel('Folder (optional)').fill('Imported');
  await expect(dialog.getByText('Ready: 2 links.')).toBeVisible();
  await settleTransitions(page);
  const scan = await new AxeBuilder({ page }).include('dialog').analyze();
  expect(scan.violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Import links' }).click();
  await expect(
    dialog.getByText('Added 2 links.', { exact: false }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('link', { name: 'Alpha' })).toBeVisible();

  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await page.getByRole('button', { name: 'Add link' }).click();
  const editor = page.getByRole('dialog', { name: 'Save a bookmark' });
  await editor.getByLabel('URL', { exact: true }).fill('https://c.example/');
  await editor.getByLabel('Title', { exact: true }).fill('Gamma');
  await editor.getByRole('button', { name: 'Save bookmark' }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(
    page.locator('#home-links').getByRole('link', { name: /Gamma/ }),
  ).toBeVisible();
});

test('opens Links on hover and keeps it open in the next tab', async ({
  page,
  context,
}) => {
  await page.goto('chrome://newtab/');
  const panel = page.locator('#home-links');
  await page.getByRole('button', { name: 'Links', exact: true }).hover();
  await expect(panel).toBeVisible();
  // Hover does not take focus from the page.
  await expect(panel.getByRole('searchbox')).not.toBeFocused();
  // Clicking after hover keeps it open and moves focus to search.
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('searchbox')).toBeFocused();
  const next = await context.newPage();
  await next.goto('chrome://newtab/');
  await expect(next.locator('#home-links')).toBeVisible();
  await next.keyboard.press('Escape');
  await expect(next.locator('#home-links')).toBeHidden();
  const third = await context.newPage();
  await third.goto('chrome://newtab/');
  await expect(
    third.getByRole('button', { name: 'Links', exact: true }),
  ).toBeVisible();
  await expect(third.locator('#home-links')).toBeHidden();
});

test('space management can be cancelled with a button or Escape', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  const select = page.getByRole('combobox', { name: 'Active space' });
  await select.selectOption('__manage');
  const form = page.locator('#space-management');
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(select).toBeFocused();
  await select.selectOption('__manage');
  await page.getByLabel('New space name').fill('Draft');
  await page.keyboard.press('Escape');
  await expect(form).toHaveCount(0);
});
