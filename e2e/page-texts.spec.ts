import { axe, test, expect, settleTransitions } from './fixtures';

test('keeps an opt-in page text copy with highlights and finds it from Library search', async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.route('https://sample.example/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Plant notes</title><nav>Menu items</nav><article><h1>Plant notes</h1><p>Leaves turn light into sugar through photosynthesis.</p><p>Roots   store water.</p></article>',
    }),
  );
  await page.goto('chrome://newtab/');
  const extensionUrl = page.url();
  const source = await context.newPage();
  await source.goto('https://sample.example/plants');
  await context.exposeBinding('readSampleDetails', (_source, fn: string) =>
    source.evaluate(`(${fn})()`),
  );
  await context.addInitScript(() => {
    if (location.pathname !== '/popup.html') return;
    const api = (
      globalThis as unknown as {
        chrome: {
          tabs: {
            query: () => Promise<unknown[]>;
            get: () => Promise<unknown>;
          };
          permissions: {
            request: () => Promise<boolean>;
            contains: () => Promise<boolean>;
          };
          scripting: {
            executeScript: (options: {
              func: () => unknown;
            }) => Promise<unknown[]>;
          };
        };
      }
    ).chrome;
    api.tabs.query = async () => [
      { id: 7, title: 'Plant notes', url: 'https://sample.example/plants' },
    ];
    api.tabs.get = async () => ({
      id: 7,
      url: 'https://sample.example/plants',
    });
    api.permissions.contains = async () => false;
    api.permissions.request = async () => true;
    api.scripting = {
      executeScript: async (options) => [
        {
          result: await (
            globalThis as unknown as {
              readSampleDetails: (fn: string) => Promise<unknown>;
            }
          ).readSampleDetails(options.func.toString()),
        },
      ],
    };
    const alternate = (
      globalThis as unknown as { browser?: { scripting: typeof api.scripting } }
    ).browser;
    if (alternate) alternate.scripting = api.scripting;
  });
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 700 });
  await popup.goto(new URL('/popup.html', extensionUrl).href);
  await expect(
    popup.getByRole('checkbox', { name: /Keep a text copy/ }),
  ).toHaveCount(0);
  await popup
    .getByRole('button', { name: 'Read page details', exact: true })
    .click();
  const keep = popup.getByRole('checkbox', { name: /Keep a text copy/ });
  await expect(keep).not.toBeChecked();
  await keep.check();
  await popup
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Bookmark saved');

  await page.getByRole('link', { name: 'Library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: /Search/ }).first();
  await search.fill('photosynthesis');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Plant notes/ }) });
  await expect(card).toBeVisible();
  await search.fill('');
  await card.getByRole('button', { name: 'Page text for Plant notes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Page text' });
  const text = dialog.getByRole('region', { name: 'Saved page text' });
  await expect(text).toContainText('Roots store water.');
  await expect(text).not.toContainText('Menu items');
  await dialog
    .getByRole('textbox', { name: 'Text to highlight' })
    .fill('light into sugar');
  await dialog
    .getByRole('textbox', { name: /Highlight note/ })
    .fill('Energy step');
  await dialog.getByRole('button', { name: 'Add highlight' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Highlight added.');
  await expect(text.locator('mark')).toHaveText('light into sugar');
  await dialog
    .getByRole('textbox', { name: 'Text to highlight' })
    .fill('not on the page');
  await dialog.getByRole('button', { name: 'Add highlight' }).click();
  await expect(dialog.getByRole('alert')).toContainText('not found');
  await settleTransitions(page);
  expect((await axe(page).include('dialog').analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('page-text.png') });

  await page.reload();
  await card.getByRole('button', { name: 'Page text for Plant notes' }).click();
  await expect(text.locator('mark')).toHaveText('light into sugar');
  await expect(
    dialog.getByRole('region', { name: 'Highlights' }).getByRole('textbox'),
  ).toHaveValue('Energy step');
  page.once('dialog', (prompt) => prompt.accept());
  await dialog.getByRole('button', { name: 'Remove text copy' }).click();
  await expect(
    dialog.getByText('This bookmark has no saved page text.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    card.getByRole('button', { name: 'Page text for Plant notes' }),
  ).toHaveCount(0);
  await search.fill('photosynthesis');
  await expect(card).toHaveCount(0);
});
