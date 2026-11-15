import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('keeps scratchpads optional, preserves drafts across tab conflicts and downloads plain text', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  const manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('note');
  await expect(
    manager.getByRole('checkbox', { name: 'Show on Home', exact: true }),
  ).not.toBeChecked();
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Ideas');
  await manager
    .getByRole('textbox', { name: 'Note text', exact: false })
    .fill('Plan a quiet reading afternoon.\nKeep this offline.');
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit Ideas', exact: true }),
  ).toBeVisible();
  await expect(
    manager.getByRole('checkbox', { name: 'Show on Home', exact: true }),
  ).not.toBeChecked();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Ideas', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await manager
    .getByRole('button', { name: 'Edit Ideas', exact: true })
    .click();
  await manager
    .getByRole('checkbox', { name: 'Show on Home', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Save widget', exact: true })
    .click();
  const downloading = page.waitForEvent('download');
  await manager
    .getByRole('button', { name: 'Download note Ideas', exact: true })
    .click();
  const download = await downloading;
  expect(await readFile((await download.path())!, 'utf8')).toBe(
    'Plan a quiet reading afternoon.\nKeep this offline.',
  );
  await manager
    .getByRole('button', { name: 'Edit Ideas', exact: true })
    .click();
  await manager
    .getByRole('textbox', { name: /Note text/ })
    .fill('My unsaved draft.');
  const other = await context.newPage();
  await other.goto(page.url());
  await other.getByRole('button', { name: 'Widgets', exact: true }).click();
  const otherManager = other.getByRole('dialog', {
    name: 'Widgets',
    exact: true,
  });
  await otherManager
    .getByRole('button', { name: 'Edit Ideas', exact: true })
    .click();
  await otherManager
    .getByRole('textbox', { name: /Note text/ })
    .fill('A newer saved note.');
  await otherManager
    .getByRole('button', { name: 'Save widget', exact: true })
    .click();
  await expect(
    otherManager.getByRole('button', { name: 'Save widget', exact: true }),
  ).toHaveCount(0);
  await other.close();
  await manager
    .getByRole('button', { name: 'Save widget', exact: true })
    .click();
  await expect(manager.getByRole('alert')).toContainText('note changed');
  await expect(manager.getByRole('textbox', { name: /Note text/ })).toHaveValue(
    'My unsaved draft.',
  );
  await manager
    .getByRole('button', { name: 'Cancel edit', exact: true })
    .click();
  await manager
    .getByRole('button', { name: 'Edit Ideas', exact: true })
    .click();
  await expect(manager.getByRole('textbox', { name: /Note text/ })).toHaveValue(
    'A newer saved note.',
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Ideas', exact: true }),
  ).toContainText('A newer saved note.');
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'Ideas', exact: true }),
  ).toContainText('A newer saved note.');
  await page.screenshot({
    path: testInfo.outputPath('note-widget-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('note-widget-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await manager
    .getByRole('button', { name: 'Remove Ideas', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit Ideas', exact: true }),
  ).toHaveCount(0);
});
