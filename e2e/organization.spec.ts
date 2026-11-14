import { test, expect } from './fixtures';

test('organizes bookmarks with folders and tags without losing them on deletion', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'Folders and tags', exact: true })
    .click();
  const manager = page.getByRole('dialog', { name: 'Folders and tags' });
  await manager
    .getByRole('textbox', { name: 'New folder name', exact: true })
    .fill('Reading');
  await manager
    .getByRole('button', { name: 'Create folder', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Reading' }),
  ).toBeVisible();
  await manager
    .getByRole('textbox', { name: 'New folder name', exact: true })
    .fill('Reading');
  await manager
    .getByRole('button', { name: 'Create folder', exact: true })
    .click();
  await expect(manager.getByRole('alert')).toContainText('already exists');
  await manager
    .getByRole('textbox', { name: 'New folder name', exact: true })
    .fill('Work');
  await manager
    .getByRole('button', { name: 'Create folder', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Work' }),
  ).toBeVisible();
  await manager
    .getByRole('textbox', { name: 'New tag name', exact: true })
    .fill('Design');
  await manager.getByLabel('Tag color', { exact: true }).fill('#cc6633');
  await manager
    .getByRole('button', { name: 'Create tag', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit tag Design' }),
  ).toBeVisible();
  await manager
    .getByRole('textbox', { name: 'New tag name', exact: true })
    .fill('Reference');
  await manager
    .getByRole('button', { name: 'Create tag', exact: true })
    .click();
  await manager.getByRole('button', { name: 'Edit tag Reference' }).click();
  await manager
    .getByRole('textbox', { name: 'Rename tag', exact: true })
    .fill('Learning');
  await manager.getByRole('button', { name: 'Save tag', exact: true }).click();
  await expect(
    manager.getByRole('button', { name: 'Edit tag Learning' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await manager.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('organization-mobile.png'),
    fullPage: true,
  });
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Useful reference');
  await editor
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await editor
    .getByRole('combobox', { name: 'Folder', exact: true })
    .selectOption({ label: 'Reading' });
  await editor.getByRole('checkbox', { name: 'Design', exact: true }).check();
  await editor.getByRole('checkbox', { name: 'Learning', exact: true }).check();
  await editor.getByRole('checkbox', { name: 'Add to favorites' }).check();
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const bookmark = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Useful reference/ }) });
  await expect(bookmark.getByText('Reading', { exact: true })).toBeVisible();
  await expect(bookmark.getByText('Design', { exact: true })).toBeVisible();
  await expect(bookmark.getByText('Learning', { exact: true })).toBeVisible();
  await page.reload();
  await expect(bookmark).toBeVisible();
  const folderFilter = page.getByRole('combobox', {
    name: 'Filter by folder',
    exact: true,
  });
  const tagFilter = page.getByRole('combobox', {
    name: 'Filter by tag',
    exact: true,
  });
  await expect(
    folderFilter.getByRole('option', { name: 'Reading (1)', exact: true }),
  ).toHaveCount(1);
  await expect(
    tagFilter.getByRole('option', { name: 'Design (1)', exact: true }),
  ).toHaveCount(1);
  await folderFilter.selectOption({ label: 'Work (0)' });
  await expect(
    page.getByRole('heading', { name: 'No bookmarks in this selection' }),
  ).toBeVisible();
  await folderFilter.selectOption({ label: 'Reading (1)' });
  await tagFilter.selectOption({ label: 'Design (1)' });
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(bookmark).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' });
  await search.fill('Learning');
  await expect(bookmark).toBeVisible();
  await search.fill('');
  await page
    .getByRole('button', { name: 'Folders and tags', exact: true })
    .click();
  await manager.getByRole('button', { name: 'Edit folder Reading' }).click();
  await manager
    .getByRole('textbox', { name: 'Rename folder', exact: true })
    .fill('Resources');
  await manager
    .getByRole('button', { name: 'Save folder', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Resources' }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(bookmark.getByText('Resources', { exact: true })).toBeVisible();
  const secondTab = await context.newPage();
  await secondTab.goto('chrome://newtab/');
  await secondTab.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    secondTab.getByRole('link', { name: /Useful reference/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Folders and tags', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await manager
    .getByRole('button', { name: 'Delete folder Resources' })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Resources' }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await manager
    .getByRole('button', { name: 'Delete folder Resources' })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Resources' }),
  ).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await manager.getByRole('button', { name: 'Delete tag Design' }).click();
  await expect(
    manager.getByRole('button', { name: 'Edit tag Design' }),
  ).toHaveCount(0);
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(folderFilter).toHaveValue('');
  await expect(tagFilter).toHaveValue('');
  await expect(bookmark).toBeVisible();
  await expect(bookmark.getByText('Resources', { exact: true })).toHaveCount(0);
  await expect(bookmark.getByText('Design', { exact: true })).toHaveCount(0);
  await expect(bookmark.getByText('Learning', { exact: true })).toBeVisible();
  await expect(
    secondTab.getByRole('listitem').getByText('Design', { exact: true }),
  ).toHaveCount(0);
  await folderFilter.selectOption('unorganized');
  await expect(bookmark).toBeVisible();
  await page.getByRole('button', { name: 'Edit Useful reference' }).click();
  await expect(
    editor.getByRole('checkbox', { name: 'Learning', exact: true }),
  ).toBeChecked();
  await editor
    .getByRole('checkbox', { name: 'Learning', exact: true })
    .uncheck();
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await tagFilter.selectOption('untagged');
  await expect(bookmark).toBeVisible();
  await page.reload();
  await expect(bookmark).toBeVisible();
  await expect(bookmark.getByText('Learning', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('library-mobile.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
