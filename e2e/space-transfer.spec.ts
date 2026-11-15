import { test, expect } from './fixtures';
test('reviews copies and moves between isolated spaces without modifying existing destination bookmarks', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Work');
  await page.getByRole('button', { name: 'Create space', exact: true }).click();
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Shared reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const cards = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .locator(':scope > li');
  async function select() {
    await page
      .getByRole('button', { name: 'Select bookmarks', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Select visible', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Transfer to space', exact: true })
      .click();
  }
  await select();
  const dialog = page.getByRole('dialog', {
    name: 'Transfer to another space',
    exact: true,
  });
  await dialog
    .getByRole('button', { name: 'Review transfer', exact: true })
    .click();
  await expect(
    dialog.getByRole('region', { name: 'Transfer review', exact: true }),
  ).toContainText('1 bookmark');
  await page.screenshot({
    path: testInfo.outputPath('space-transfer-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('space-transfer-mobile.png'),
  });
  await dialog
    .getByRole('button', { name: 'Copy bookmarks', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(cards).toHaveCount(1);
  const spaces = page.getByRole('combobox', {
    name: 'Active space',
    exact: true,
  });
  await spaces.selectOption({ label: 'Work' });
  await expect(cards).toHaveCount(1);
  await spaces.selectOption('default');
  await select();
  await dialog
    .getByRole('combobox', { name: 'Transfer action', exact: true })
    .selectOption('move');
  await dialog
    .getByRole('button', { name: 'Review transfer', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Move bookmarks', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(cards).toHaveCount(0);
  await spaces.selectOption({ label: 'Work' });
  await expect(cards).toHaveCount(2);
  await page.reload();
  await expect(cards).toHaveCount(2);
});
