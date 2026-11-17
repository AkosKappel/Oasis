import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, test, expect } from './fixtures';
test('reviews a window snapshot, skips duplicates and opens a saved folder', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.route('https://session.example/**', (route) =>
    route.fulfill({ body: '<title>Session example</title>' }),
  );
  await context.addInitScript(() => {
    if (!location.protocol.endsWith('-extension:')) return;
    const api = (
      globalThis as unknown as {
        chrome: {
          permissions: {
            request: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
          tabs: { query: () => Promise<unknown[]> };
        };
      }
    ).chrome;
    let requests = 0;
    api.permissions.request = async () => ++requests > 1;
    api.permissions.remove = async () => true;
    api.tabs.query = async () => [
      { title: 'Research guide', url: 'https://session.example/guide' },
      { title: 'Repeated tab', url: 'https://session.example/guide' },
      { title: 'Reference', url: 'https://session.example/reference' },
      { title: 'Leave open', url: 'https://session.example/leave' },
      { url: 'chrome://settings' },
      { url: 'https://private.example', incognito: true },
    ];
  });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Sessions and tabs');
  const dialog = page.getByRole('dialog', { name: 'Sessions and tabs' });
  await dialog
    .getByRole('button', { name: 'Read window tabs', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('not granted');
  await expect(
    dialog.getByRole('list', { name: 'Window tab preview' }),
  ).toHaveCount(0);
  await dialog
    .getByRole('button', { name: 'Read window tabs', exact: true })
    .click();
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await dialog
    .getByRole('checkbox', { name: 'Save Leave open', exact: true })
    .uncheck();
  await dialog
    .getByRole('textbox', { name: 'Session folder name' })
    .fill('Research session');
  expect(
    (await new AxeBuilder({ page }).include('dialog').analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path:
      (process.env.OASIS_PREVIEW_DIR ?? '/tmp/oasis-previews') +
      '/session-preview.png',
  });
  await dialog
    .getByRole('button', { name: 'Save selected tabs', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Saved 2 links');
  await expect(
    dialog.getByRole('checkbox', { name: 'Save Research guide', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Open folder', exact: true })
    .click();
  await dialog
    .getByRole('combobox', { name: 'Folder to open' })
    .selectOption({ label: 'Research session' });
  await expect(
    dialog.getByText('2 unique links to open.', { exact: true }),
  ).toBeVisible();
  const beforeOpening = new Set(context.pages());
  await dialog
    .getByRole('button', { name: 'Open folder links', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toHaveText('Opened 2 tabs.');
  await expect
    .poll(() => context.pages().filter((tab) => !beforeOpening.has(tab)).length)
    .toBe(2);
  const opened = context.pages().filter((tab) => !beforeOpening.has(tab));
  for (const tab of opened) {
    await tab.bringToFront();
    await expect(tab).toHaveURL(
      /^https:\/\/session.example\/(guide|reference)$/,
    );
  }
  await page.bringToFront();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('link', { name: /Research guide/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Reference/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Leave open/ })).toHaveCount(0);
});
