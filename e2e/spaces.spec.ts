import { test, expect } from './fixtures';

test('spaces isolate libraries, survive reload, capture explicitly and recover after deletion in another tab', async ({
  page,
  context,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  async function add(title: string) {
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
  await add('Personal');
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Work');
  await page.getByRole('button', { name: 'Create space', exact: true }).click();
  const selector = page.getByRole('combobox', {
    name: 'Active space',
    exact: true,
  });
  await expect(
    selector.getByRole('option', { name: 'Work', exact: true }),
  ).toHaveCount(1);
  const work = await selector
    .getByRole('option', { name: 'Work', exact: true })
    .getAttribute('value');
  await selector.selectOption(work!);
  await expect(
    page.getByRole('link', { name: /Personal.*opens in a new tab/ }),
  ).toHaveCount(0);
  await add('Work');
  await page.reload();
  await expect(selector).toHaveValue(work!);
  await expect(
    page.getByRole('link', { name: /Work.*opens in a new tab/ }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await other
    .getByRole('combobox', { name: 'Active space' })
    .selectOption('default');
  await expect(
    other.getByRole('link', { name: /Personal.*opens in a new tab/ }),
  ).toBeVisible();
  await expect(
    other.getByRole('link', { name: /Work.*opens in a new tab/ }),
  ).toHaveCount(0);
  const extensionUrl = new URL(
    context.serviceWorkers()[0]?.url() ??
      (await context.waitForEvent('serviceworker')).url(),
  );
  const origin = `${extensionUrl.protocol}//${extensionUrl.host}`;
  const capture = await context.newPage();
  await capture.goto(
    `${origin}/capture.html#title=Captured&url=https%3A%2F%2Fexample.com%2Fcaptured`,
  );
  await capture
    .getByRole('combobox', { name: 'Active space' })
    .selectOption(work!);
  await capture
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(capture.getByRole('status')).toContainText('Work library');
  await capture.close();
  await expect(
    page.getByRole('link', { name: /Captured.*opens in a new tab/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Rename current space', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Rename space', exact: true })
    .fill('Projects');
  await page
    .getByRole('button', { name: 'Save space name', exact: true })
    .click();
  await expect(
    selector.getByRole('option', { name: 'Projects', exact: true }),
  ).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('spaces-desktop.png') });
  await page.setViewportSize({ width: 320, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('spaces-mobile.png') });
  await other
    .getByRole('combobox', { name: 'Active space' })
    .selectOption(work!);
  await other
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  other.once('dialog', (dialog) => dialog.accept());
  await other
    .getByRole('button', { name: 'Delete current space', exact: true })
    .click();
  await expect(selector).toHaveValue('default');
  await expect(
    page.getByRole('link', { name: /Personal.*opens in a new tab/ }),
  ).toBeVisible();
  await page.reload();
  await expect(selector).toHaveValue('default');
  await other.close();
});
