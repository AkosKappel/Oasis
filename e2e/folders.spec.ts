import { test, expect } from './fixtures';

test('creates and moves subfolders, filters descendants and protects parent deletion', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  const manage = page.getByRole('button', {
    name: 'Folders and tags',
    exact: true,
  });
  await manage.click();
  const manager = page.getByRole('dialog', { name: 'Folders and tags' });
  for (const name of ['Reading', 'Work']) {
    await manager
      .getByRole('textbox', { name: 'New folder name', exact: true })
      .fill(name);
    await manager
      .getByRole('button', { name: 'Create folder', exact: true })
      .click();
    await expect(
      manager.getByRole('button', { name: `Edit folder ${name}`, exact: true }),
    ).toBeVisible();
  }
  for (const parent of ['Reading', 'Work']) {
    await manager
      .getByRole('textbox', { name: 'New folder name', exact: true })
      .fill('Articles');
    await manager
      .getByRole('combobox', { name: 'Parent folder', exact: true })
      .selectOption({ label: parent });
    await manager
      .getByRole('button', { name: 'Create folder', exact: true })
      .click();
    await expect(
      manager.getByRole('button', {
        name: `Edit folder ${parent} / Articles`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Nested resource');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await page
    .getByRole('combobox', { name: 'Folder', exact: true })
    .selectOption({ label: 'Reading / Articles' });
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const filter = page.getByRole('combobox', {
    name: 'Filter by folder',
    exact: true,
  });
  await filter.selectOption({ label: 'Reading (1)' });
  await expect(
    page.getByRole('link', { name: /Nested resource/ }),
  ).toBeVisible();
  await manage.click();
  await manager
    .getByRole('button', {
      name: 'Edit folder Reading / Articles',
      exact: true,
    })
    .click();
  await manager
    .getByRole('textbox', { name: 'Rename folder', exact: true })
    .fill('Sources');
  await manager
    .getByRole('combobox', { name: 'Parent folder', exact: true })
    .selectOption({ label: 'Work' });
  await manager
    .getByRole('button', { name: 'Save folder', exact: true })
    .click();
  await expect(
    manager.getByRole('button', {
      name: 'Edit folder Work / Sources',
      exact: true,
    }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await manager
    .getByRole('button', { name: 'Delete folder Work', exact: true })
    .click();
  await expect(manager.getByRole('alert')).toContainText('subfolders');
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('link', { name: /Nested resource/ })).toHaveCount(
    0,
  );
  await filter.selectOption({ label: 'Work (1)' });
  await expect(
    page.getByRole('link', { name: /Nested resource/ }),
  ).toBeVisible();
  await expect(page.getByText('Work / Sources', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Work / Sources', { exact: true })).toBeVisible();
});
