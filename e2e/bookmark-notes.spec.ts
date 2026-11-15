import { test, expect } from './fixtures';
test('edits searchable plain-text notes and preserves drafts during a concurrent edit', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const noteButton = page.getByRole('button', {
    name: 'Notes for Reference',
    exact: true,
  });
  await noteButton.click();
  const dialog = page.getByRole('dialog', {
    name: 'Bookmark notes',
    exact: true,
  });
  const input = dialog.getByRole('textbox', { name: 'Notes', exact: true });
  const original =
    'Zephyr planning\nKeep the first draft small.\n<script>window.notesExecuted = true</script>';
  await input.fill(original);
  await dialog.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(noteButton).toHaveClass(/text-primary-content/);
  await page.getByRole('searchbox').fill('Zephyr');
  await expect(page.getByRole('link', { name: /Reference/ })).toBeVisible();
  expect(
    await page.evaluate(() => Object.hasOwn(window, 'notesExecuted')),
  ).toBe(false);
  await page.getByRole('searchbox').clear();
  await noteButton.click();
  await expect(input).toHaveValue(original);
  const other = await context.newPage();
  await other.goto(page.url());
  await other
    .getByRole('button', { name: 'Notes for Reference', exact: true })
    .click();
  await other
    .getByRole('textbox', { name: 'Notes', exact: true })
    .fill('Updated from another tab');
  await other.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await other.close();
  await input.fill('My unsaved draft');
  await dialog.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Notes changed in another tab',
  );
  await expect(input).toHaveValue('My unsaved draft');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await noteButton.click();
  await expect(input).toHaveValue('Updated from another tab');
  await input.fill(
    'Zephyr planning\nWrite down the useful parts, then return to the work.',
  );
  await page.screenshot({ path: testInfo.outputPath('bookmark-notes.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('bookmark-notes-mobile.png'),
  });
  await dialog.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await noteButton.click();
  await expect(input).toHaveValue(/Zephyr planning/);
  await input.clear();
  await dialog.getByRole('button', { name: 'Save notes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(noteButton).not.toHaveClass(/text-primary-content/);
});
