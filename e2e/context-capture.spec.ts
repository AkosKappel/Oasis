import { test, expect } from './fixtures';
test('opens the context-capture editor, scrubs its request and saves to Library', async ({
  page,
  context,
}) => {
  await page.goto('chrome://newtab/');
  const captureUrl = new URL('/capture.html', page.url()).href;
  const capture = await context.newPage();
  await capture.goto(
    `${captureUrl}#${new URLSearchParams({ title: 'Captured from context menu', url: 'https://example.com/resource' })}`,
  );
  await expect(
    capture.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('Captured from context menu');
  await expect(capture).toHaveURL(captureUrl);
  await capture
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(capture.getByRole('status')).toContainText('Bookmark saved');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /Captured from context menu/ }),
  ).toBeVisible();
  await capture.close();
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  const manifest = await worker.evaluate(() =>
    (
      globalThis as unknown as {
        chrome: {
          runtime: {
            getManifest: () => {
              permissions: string[];
              commands: Record<string, unknown>;
            };
          };
        };
      }
    ).chrome.runtime.getManifest(),
  );
  expect(manifest.permissions).toEqual([
    'activeTab',
    'contextMenus',
    'favicon',
  ]);
  expect(manifest.commands).toHaveProperty('oasis-save-page');
});
