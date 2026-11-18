import { chooseIcon, openLibraryTool, test, expect } from './fixtures';

test('shows folder and space icons where they are listed', async ({ page }) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Folders and tags');
  const manager = page.getByRole('dialog', { name: 'Folders and tags' });
  await manager
    .getByRole('textbox', { name: 'New folder name' })
    .fill('Reading');
  await manager.getByRole('button', { name: /^Folder icon/ }).click();
  const choices = page.getByRole('dialog', { name: 'Choose folder icon' });
  await expect(choices.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('read');
  await expect(choices.getByRole('button', { name: 'Books' })).toBeVisible();
  await expect(choices.getByRole('button', { name: 'Music' })).toHaveCount(0);
  await choices.getByRole('button', { name: 'Books' }).click();
  await manager.getByRole('button', { name: 'Create folder' }).click();
  await expect(
    manager.getByRole('listitem').filter({ hasText: 'Reading' }),
  ).toContainText('📚');
  await manager.getByRole('button', { name: 'Edit folder Reading' }).click();
  await expect(
    manager.getByRole('button', { name: /^Folder icon/ }),
  ).toHaveAccessibleName('Folder icon Books');
  await manager.getByRole('button', { name: 'Cancel rename' }).click();
  await manager.getByRole('button', { name: 'Done' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Filter by folder' }),
  ).toContainText('📚 Reading');

  const selector = page.getByRole('combobox', { name: 'Active space' });
  await selector.selectOption('__manage');
  await page
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Work');
  await chooseIcon(page, 'Space icon', 'Work');
  await page.getByRole('button', { name: 'Create space', exact: true }).click();
  await expect(
    selector.getByRole('option', { name: '💼 Work', exact: true }),
  ).toHaveCount(1);

  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Links', exact: true });
  await expect(panel.locator('summary[title="Reading"]')).toContainText('📚');
});
