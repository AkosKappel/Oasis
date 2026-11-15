import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('reviews local tag suggestions without fetching pages or saving unchosen tags', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'Folders and tags', exact: true })
    .click();
  const org = page.getByRole('dialog', {
    name: 'Folders and tags',
    exact: true,
  });
  for (const name of ['Reference', 'Reading']) {
    await org
      .getByRole('textbox', { name: 'New tag name', exact: true })
      .fill(name);
    await org.getByRole('button', { name: 'Create tag', exact: true }).click();
    await expect(
      org.getByRole('button', { name: `Edit tag ${name}`, exact: true }),
    ).toBeVisible();
  }
  await org.getByRole('button', { name: 'Done', exact: true }).click();
  async function add(title: string, url: string, tags: string[]) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    const editor = page.getByRole('dialog', {
      name: 'Save a bookmark',
      exact: true,
    });
    await editor
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title);
    await editor.getByRole('textbox', { name: 'URL', exact: true }).fill(url);
    for (const tag of tags)
      await editor.getByRole('checkbox', { name: tag, exact: true }).check();
    await editor
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(editor).toHaveCount(0);
  }
  await add('First reading guide', 'https://reading.example/first', [
    'Reference',
  ]);
  await add('Second reading guide', 'https://reading.example/second', [
    'Reference',
    'Reading',
  ]);
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  const editor = page.getByRole('dialog', {
    name: 'Save a bookmark',
    exact: true,
  });
  await editor
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('New reading guide');
  await editor
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://reading.example/new');
  await editor
    .getByRole('textbox', { name: /Description/ })
    .fill('Keep this draft.');
  await editor.getByRole('checkbox', { name: 'Reading', exact: true }).check();
  await editor
    .getByRole('button', { name: 'Suggest tags', exact: true })
    .click();
  await expect(
    editor.getByRole('list', { name: 'Suggested tags' }),
  ).toContainText('2 of 2 bookmarks');
  await expect(
    editor.getByRole('checkbox', { name: 'Reference', exact: true }),
  ).not.toBeChecked();
  await expect(
    editor.getByRole('checkbox', { name: 'Reading', exact: true }),
  ).toBeChecked();
  await expect(
    editor.getByRole('textbox', { name: /Description/ }),
  ).toHaveValue('Keep this draft.');
  await editor
    .getByRole('button', { name: 'Add Reference', exact: true })
    .click();
  await expect(
    editor.getByRole('checkbox', { name: 'Reference', exact: true }),
  ).toBeChecked();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await editor.screenshot({
    path: testInfo.outputPath('tag-suggestions-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.screenshot({
    path: testInfo.outputPath('tag-suggestions-mobile.png'),
  });
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /New reading guide/ }) });
  await expect(card.getByText('Reference', { exact: true })).toBeVisible();
  await expect(card.getByText('Reading', { exact: true })).toBeVisible();
  await page.reload();
  await expect(card.getByText('Reference', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await editor
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://unknown.example/');
  await editor
    .getByRole('button', { name: 'Suggest tags', exact: true })
    .click();
  await expect(editor.getByRole('status')).toContainText('No tags were found');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /New reading guide/ }),
  ).toBeVisible();
});
