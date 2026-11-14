import { test, expect } from './fixtures';
test('saves a preferred engine and submits only explicit Home or palette web searches', async ({
  page,
  context,
}, testInfo) => {
  const requests: string[] = [];
  await context.route('https://duckduckgo.com/**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Search destination</title><p>Search destination fixture</p>',
    });
  });
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('searchbox', { name: 'Search bookmarks', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Home search', exact: true })
    .selectOption('duckduckgo');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const query = 'café & calm + focus';
  await page
    .getByRole('searchbox', { name: 'Search DuckDuckGo', exact: true })
    .fill(query);
  expect(requests).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('preferred-search.png') });
  await page
    .getByRole('searchbox', { name: 'Search DuckDuckGo', exact: true })
    .press('Enter');
  await expect(page).toHaveURL(/duckduckgo.com/);
  expect(new URL(requests[0]!).searchParams.get('q')).toBe(query);
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('searchbox', { name: 'Search DuckDuckGo', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', {
    name: 'Search Oasis',
    exact: true,
  });
  await palette.getByRole('combobox').fill('a quiet workspace');
  await expect(palette.getByRole('option')).toContainText('Search DuckDuckGo');
  expect(requests).toHaveLength(1);
  await page.screenshot({
    path: testInfo.outputPath('web-search-palette.png'),
  });
  await palette.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(/duckduckgo.com/);
  expect(new URL(requests[1]!).searchParams.get('q')).toBe('a quiet workspace');
  await page.goto('chrome://newtab/');
  const other = await context.newPage();
  await other.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Home search', exact: true })
    .selectOption('google');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('searchbox', { name: 'Search DuckDuckGo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Home search', exact: true })
    .selectOption('google');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    other.getByRole('searchbox', { name: 'Search Google', exact: true }),
  ).toBeVisible();
  await other.close();
  expect(requests).toHaveLength(2);
});
