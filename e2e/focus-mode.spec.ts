import { test, expect } from './fixtures';
test('hides distractions, pauses across tabs and finishes after reload without timer drift', async ({
  page,
  context,
}, testInfo) => {
  await page.clock.install({ time: new Date() });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Session minutes', exact: true })
    .fill('1');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Focus mode', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Focus mode', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Search bookmarks' }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('focus-mode.png') });
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('region', { name: 'Focus mode', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause focus', exact: true }).click();
  await expect(
    other.getByRole('button', { name: 'Resume focus', exact: true }),
  ).toBeVisible();
  await other.close();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Resume focus', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume focus', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause focus', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('status')).toContainText(
    'Your focus session is complete',
  );
  await expect(
    page.getByRole('searchbox', { name: 'Search bookmarks' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Dismiss timer', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Focus timer', exact: true }),
  ).toHaveCount(0);
});
