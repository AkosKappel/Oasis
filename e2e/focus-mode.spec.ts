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

test('waits between focus and break phases and preserves a paused break across reloads', async ({
  page,
  context,
}, testInfo) => {
  await page.clock.install({ time: new Date() });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Session minutes', exact: true })
    .fill('1');
  await page
    .getByRole('checkbox', { name: 'Alternate focus and breaks' })
    .check();
  await page
    .getByRole('spinbutton', { name: 'Break minutes', exact: true })
    .fill('1');
  await page.screenshot({ path: testInfo.outputPath('focus-cycle-setup.png') });
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause focus', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(
    page.getByRole('button', { name: 'Start break', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(3_600_000);
  await expect(
    page.getByRole('button', { name: 'Start break', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pause break', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Start break', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Take a break', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause break', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Resume break', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Break paused', exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('button', { name: 'Resume break', exact: true }),
  ).toBeVisible();
  await other.close();
  await page.getByRole('button', { name: 'Resume break', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause break', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('focus-cycle-break-desktop.png'),
  });
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: testInfo.outputPath('focus-cycle-break-mobile.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.clock.fastForward(61_000);
  await expect(
    page.getByRole('heading', { name: 'Break complete', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Start next focus', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause focus', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'End cycle', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Focus timer', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('searchbox', { name: 'Search bookmarks' }),
  ).toBeVisible();
});

test('offers an optional long break after every fourth focus session', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date() });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Session minutes', exact: true })
    .fill('1');
  await page
    .getByRole('checkbox', { name: 'Alternate focus and breaks' })
    .check();
  await page
    .getByRole('spinbutton', { name: 'Break minutes', exact: true })
    .fill('1');
  await page.getByRole('checkbox', { name: /Take a long break/ }).check();
  await page
    .getByRole('spinbutton', { name: 'Long break minutes', exact: true })
    .fill('2');
  await page.screenshot({ path: testInfo.outputPath('long-break-setup.png') });
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  const pauseFocus = page.getByRole('button', {
    name: 'Pause focus',
    exact: true,
  });
  for (let round = 1; round <= 3; round++) {
    await expect(pauseFocus).toBeVisible();
    await page.clock.fastForward(61_000);
    await page
      .getByRole('button', { name: 'Start break', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Pause break', exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(61_000);
    await page
      .getByRole('button', { name: 'Start next focus', exact: true })
      .click();
  }
  await expect(pauseFocus).toBeVisible();
  await page.clock.fastForward(61_000);
  await page
    .getByRole('button', { name: 'Start long break', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Take a long break', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('02:00');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Take a long break', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('long-break.png') });
  await page.clock.fastForward(121_000);
  await expect(
    page.getByRole('heading', { name: 'Long break complete', exact: true }),
  ).toBeVisible();
});

test('starts the next phase automatically only while Oasis is open', async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Session minutes', exact: true })
    .fill('1');
  await page
    .getByRole('checkbox', { name: 'Alternate focus and breaks' })
    .check();
  await page
    .getByRole('spinbutton', { name: 'Break minutes', exact: true })
    .fill('1');
  await page
    .getByRole('checkbox', { name: 'Start the next phase automatically' })
    .check();
  await expect(
    page.getByText('starts on time while an Oasis tab'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause focus', exact: true }),
  ).toBeVisible();
  await page.clock.runFor(61_000);
  await expect(
    page.getByRole('heading', { name: 'Take a break', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start break', exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(61_000);
  await expect(
    page.getByRole('button', { name: 'Pause focus', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Focus sessions completed: 1')).toBeVisible();
  // One jump models a sleeping computer: the next tick is long after the deadline.
  await page.clock.fastForward(10 * 60_000);
  await expect(
    page.getByRole('button', { name: 'Start break', exact: true }),
  ).toBeVisible();
});
