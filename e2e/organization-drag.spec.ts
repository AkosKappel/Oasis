import { openLibraryTool } from './fixtures';
import { test, expect } from './fixtures';
test('drags bookmarks to folders and manual positions, with keyboard ordering alternatives', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Folders and tags');
  for (const name of ['Reading', 'Archive']) {
    await page
      .getByRole('textbox', { name: 'New folder name', exact: true })
      .fill(name);
    await page
      .getByRole('button', { name: 'Create folder', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Edit folder ${name}`, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (const title of ['A', 'B', 'C']) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await page
      .getByRole('textbox', { name: 'URL', exact: true })
      .fill(`https://example.com/${title}`);
    await page
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page
    .getByRole('button', { name: 'Organize by dragging', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Sort by', exact: true })
    .selectOption('manual');
  const cards = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .locator(':scope > li');
  const order = () =>
    cards.evaluateAll((items) =>
      items.map((item) => item.querySelector('a span')?.textContent),
    );
  await expect.poll(order).toEqual(['A', 'B', 'C']);
  await page
    .getByRole('button', { name: 'Drag bookmark C', exact: true })
    .dragTo(page.getByRole('button', { name: 'Drag bookmark B', exact: true }));
  await expect.poll(order).toEqual(['A', 'C', 'B']);
  await page.getByRole('button', { name: 'Move up: C', exact: true }).click();
  await expect.poll(order).toEqual(['C', 'A', 'B']);
  await page
    .getByRole('button', { name: 'Drag bookmark C', exact: true })
    .dragTo(
      page.getByRole('button', { name: 'Drag folder Reading', exact: true }),
    );
  const folder = page.getByRole('combobox', {
    name: 'Filter by folder',
    exact: true,
  });
  const reading = await folder
    .getByRole('option', { name: /^Reading/ })
    .getAttribute('value');
  await folder.selectOption(reading!);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('C');
  await page
    .getByRole('button', { name: 'Drag bookmark C', exact: true })
    .dragTo(
      page.getByText('Drop in Unorganized / top-level folders', {
        exact: true,
      }),
    );
  await expect(cards).toHaveCount(0);
  await folder.selectOption('');
  await expect(cards).toHaveCount(3);
  await page
    .getByRole('combobox', { name: 'Folder order', exact: true })
    .selectOption('manual');
  await page
    .getByRole('button', { name: 'Move up: Archive', exact: true })
    .click();
  const panel = page.getByRole('region', {
    name: 'Drag organization',
    exact: true,
  });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('organization-drag-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('organization-drag-mobile.png'),
  });
  await page.reload();
  await page
    .getByRole('button', { name: 'Organize by dragging', exact: true })
    .click();
  await expect.poll(order).toEqual(['C', 'A', 'B']);
  await page
    .getByRole('button', { name: 'Drag folder Reading', exact: true })
    .dragTo(
      page.getByRole('button', { name: 'Drag folder Archive', exact: true }),
    );
  await expect(
    page.getByRole('button', {
      name: 'Drag folder Archive / Reading',
      exact: true,
    }),
  ).toBeVisible();
});
