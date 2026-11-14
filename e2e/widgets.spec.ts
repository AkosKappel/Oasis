import { test, expect } from './fixtures';
test('adds optional world clocks and countdowns, edits visibility and persists changes', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await expect(page.getByRole('region', { name: 'Home widgets' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await dialog.getByRole('textbox', { name: 'Widget label' }).fill('Tokyo');
  await dialog
    .getByRole('combobox', { name: 'Time zone' })
    .selectOption('Asia/Tokyo');
  await dialog.getByRole('button', { name: 'Add widget', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Edit Tokyo', exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('combobox', { name: 'Widget type' })
    .selectOption('countdown');
  await dialog
    .getByRole('textbox', { name: 'Widget label' })
    .fill('Next adventure');
  await dialog
    .getByLabel('Countdown date and time', { exact: true })
    .fill('2030-06-01T12:00');
  await dialog.getByRole('button', { name: 'Add widget', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Edit Next adventure', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Tokyo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Next adventure', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('widgets.png') });
  await page.reload();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('article', { name: 'Tokyo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await dialog.getByRole('button', { name: 'Edit Tokyo', exact: true }).click();
  await dialog
    .getByRole('checkbox', { name: 'Show on Home', exact: true })
    .uncheck();
  await dialog
    .getByRole('button', { name: 'Save widget', exact: true })
    .click();
  await expect(
    other.getByRole('article', { name: 'Tokyo', exact: true }),
  ).toHaveCount(0);
  await other.close();
  await dialog
    .getByRole('button', { name: 'Remove Next adventure', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Edit Next adventure', exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
