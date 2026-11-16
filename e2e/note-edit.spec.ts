import { test, expect, openSettingsPage } from './fixtures';
test('edits a Home note directly and keeps conflict drafts without nested task dialogs', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60000);
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Widgets');
  const manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('note');
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Ideas');
  await manager
    .getByRole('textbox', { name: /Note text/ })
    .fill('Keep a little space.');
  await manager
    .getByRole('checkbox', { name: 'Show on Home', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit Ideas', exact: true }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  const article = page.getByRole('article', { name: 'Ideas', exact: true });
  await article.hover();
  await article
    .getByRole('button', { name: 'Edit note Ideas', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: 'Edit Ideas', exact: true });
  await editor
    .getByRole('textbox', { name: 'Note text', exact: true })
    .fill('An idea worth keeping.');
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(article).toContainText('An idea worth keeping.');
  await article
    .getByRole('button', { name: 'Edit note Ideas', exact: true })
    .click();
  await editor
    .getByRole('textbox', { name: 'Note text', exact: true })
    .fill('An unsaved draft.');
  const other = await context.newPage();
  await other.goto(page.url());
  await other
    .getByRole('article', { name: 'Ideas' })
    .getByRole('button', { name: 'Edit note Ideas' })
    .click();
  await other
    .getByRole('textbox', { name: 'Note text', exact: true })
    .fill('A newer note from another tab.');
  await other.getByRole('button', { name: 'Save note', exact: true }).click();
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('changed');
  await expect(
    editor.getByRole('textbox', { name: 'Note text', exact: true }),
  ).toHaveValue('An unsaved draft.');
  await page.screenshot({ path: testInfo.outputPath('note-direct-edit.png') });
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(article).toContainText('A newer note from another tab.');
  await other.close();
});
