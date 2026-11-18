import { axe, test, expect } from './fixtures';
test('saves, edits and loads dynamic searches with reload and cross-tab persistence', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  async function add(title: string, url: string) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url);
    await page
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await add('Reading guide', 'https://reading.example/guide');
  await add('Other resource', 'https://other.example/resource');
  const search = page.getByRole('searchbox', {
    name: 'Search bookmarks',
    exact: true,
  });
  await search.fill('domain:reading.example');
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  const manager = page.getByRole('dialog', {
    name: 'Saved searches',
    exact: true,
  });
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue('domain:reading.example');
  await manager
    .getByRole('textbox', { name: 'Search name', exact: true })
    .fill('Reading resources');
  await manager
    .getByRole('button', { name: 'Save search', exact: true })
    .click();
  await expect(manager.getByRole('status')).toHaveText('Search saved.');
  expect(
    (
      await axe(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('saved-searches-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('saved-searches-mobile.png'),
    fullPage: true,
  });
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Saved searches', exact: true }),
  ).toBeFocused();
  await search.fill('');
  await page
    .getByRole('combobox', { name: 'Collections', exact: true })
    .selectOption({ label: 'Reading resources' });
  await expect(search).toHaveValue('domain:reading.example');
  await expect(page.getByRole('link', { name: /Reading guide/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Other resource/ })).toHaveCount(
    0,
  );
  await search.fill('');
  await add('New reading guide', 'https://reading.example/new');
  await page
    .getByRole('combobox', { name: 'Collections', exact: true })
    .selectOption({ label: 'Reading resources' });
  await expect(
    page.getByRole('link', { name: /New reading guide/ }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other
      .getByRole('combobox', { name: 'Collections', exact: true })
      .getByRole('option', { name: 'Reading resources' }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  await manager
    .getByRole('button', {
      name: 'Edit saved search Reading resources',
      exact: true,
    })
    .click();
  await manager
    .getByRole('textbox', { name: 'Search name', exact: true })
    .fill('Updated reading');
  await manager
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Load Updated reading', exact: true }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    other
      .getByRole('combobox', { name: 'Collections', exact: true })
      .getByRole('option', { name: 'Updated reading' }),
  ).toHaveCount(1);
  await other.close();
  await page.reload();
  await page.getByText('Filters and collections', { exact: true }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Collections', exact: true })
      .getByRole('option', { name: 'Updated reading' }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await manager
    .getByRole('button', {
      name: 'Delete saved search Updated reading',
      exact: true,
    })
    .click();
  await expect(manager.getByRole('status')).toHaveText('Saved search deleted.');
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('link', { name: /Reading guide/ })).toBeVisible();
});
