import { test, expect } from './fixtures';
test('opts into daily focus, edits and completes it across tabs and reloads', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('region', { name: 'Daily focus', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Show daily focus', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Appearance', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: "Today's focus", exact: true })
    .fill('Make room for thoughtful work');
  await page.getByRole('button', { name: 'Save focus', exact: true }).click();
  await expect(
    page.getByText('Make room for thoughtful work', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: "Complete today's focus", exact: true })
    .check();
  await expect(
    page.getByRole('region', { name: 'Daily focus' }).getByRole('status'),
  ).toContainText('Done for today');
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('checkbox', {
      name: "Complete today's focus",
      exact: true,
    }),
  ).toBeChecked();
  await other.close();
  await page.reload();
  await page.getByRole('button', { name: 'Edit focus', exact: true }).click();
  await page
    .getByRole('textbox', { name: "Today's focus", exact: true })
    .fill('A revised focus');
  await page.getByRole('button', { name: 'Save focus', exact: true }).click();
  await expect(
    page.getByText('A revised focus', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('daily-focus.png') });
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Show daily focus', exact: true })
    .uncheck();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Daily focus', exact: true }),
  ).toHaveCount(0);
});
