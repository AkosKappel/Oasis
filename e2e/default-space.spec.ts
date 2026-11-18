import { test, expect } from './fixtures';

test('opens new tabs in the chosen default space without moving open tabs', async ({
  context,
  page,
}) => {
  await page.goto('chrome://newtab/');
  const url = page.url();
  const selector = page.getByRole('combobox', { name: 'Active space' });
  await selector.selectOption('__manage');
  await page
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Work');
  await page.getByRole('button', { name: 'Create space', exact: true }).click();
  const work = await selector
    .getByRole('option', { name: 'Work', exact: true })
    .getAttribute('value');
  await selector.selectOption(work!);
  await selector.selectOption('__manage');
  const toggle = page.getByRole('checkbox', {
    name: 'Open new tabs in this space',
  });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(toggle).toBeChecked();

  const fresh = await context.newPage();
  await fresh.goto(url);
  await expect(
    fresh.getByRole('combobox', { name: 'Active space' }),
  ).toHaveValue(work!);
  await fresh.close();

  await selector.selectOption('default');
  await expect(selector).toHaveValue('default');
  await page.reload();
  await expect(selector).toHaveValue('default');

  await selector.selectOption(work!);
  await selector.selectOption('__manage');
  await toggle.uncheck();
  const after = await context.newPage();
  await after.goto(url);
  await expect(
    after.getByRole('combobox', { name: 'Active space' }),
  ).toHaveValue('default');
});
