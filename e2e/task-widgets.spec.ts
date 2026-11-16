import { openSettingsPage } from './fixtures';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('keeps task lists optional, syncs completion and manages owned tasks with exports', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Widgets');
  const manager = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await manager
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('tasks');
  await expect(
    manager.getByRole('checkbox', { name: 'Show on Home', exact: true }),
  ).not.toBeChecked();
  await manager
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Reading');
  await manager
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Manage tasks Reading', exact: true }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Reading', exact: true }),
  ).toHaveCount(0);
  await openSettingsPage(page, 'Widgets');
  await manager
    .getByRole('button', { name: 'Manage tasks Reading', exact: true })
    .click();
  const tasks = page.getByRole('dialog', {
    name: 'Tasks: Reading',
    exact: true,
  });
  for (const text of ['Read a chapter', 'Write a short summary']) {
    await tasks.getByRole('textbox', { name: 'Task', exact: true }).fill(text);
    await tasks.getByRole('button', { name: 'Add task', exact: true }).click();
    await expect(
      tasks.getByRole('checkbox', { name: text, exact: true }),
    ).toBeVisible();
  }
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'widgetTasks') {
        IDBObjectStore.prototype.put = original;
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await tasks
    .getByRole('checkbox', { name: 'Read a chapter', exact: true })
    .click();
  await expect(tasks.getByRole('alert')).toContainText(
    'Storage quota exceeded',
  );
  await expect(
    tasks.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).not.toBeChecked();
  await tasks
    .getByRole('checkbox', { name: 'Read a chapter', exact: true })
    .check();
  await expect(
    tasks.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).toBeChecked();
  const downloading = page.waitForEvent('download');
  await tasks
    .getByRole('button', { name: 'Download tasks', exact: true })
    .click();
  const download = await downloading;
  expect(await readFile((await download.path())!, 'utf8')).toContain(
    '[x] Read a chapter',
  );
  await tasks
    .getByRole('button', {
      name: 'Edit task Write a short summary',
      exact: true,
    })
    .click();
  await tasks
    .getByRole('textbox', { name: 'Task', exact: true })
    .fill('Write a reading note');
  await tasks.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    tasks.getByRole('checkbox', { name: 'Write a reading note', exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await tasks.screenshot({
    path: testInfo.outputPath('task-manager-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await tasks.screenshot({
    path: testInfo.outputPath('task-manager-mobile.png'),
  });
  await page.keyboard.press('Escape');
  await expect(tasks).toHaveCount(0);
  await expect(manager).toBeVisible();
  await expect(
    manager.getByRole('button', { name: 'Manage tasks Reading', exact: true }),
  ).toBeFocused();
  await manager
    .getByRole('button', { name: 'Edit Reading', exact: true })
    .click();
  await manager
    .getByRole('checkbox', { name: 'Show on Home', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Save widget', exact: true })
    .click();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  const card = page.getByRole('article', { name: 'Reading', exact: true });
  await expect(
    card.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).toBeChecked();
  const other = await context.newPage();
  await other.goto(page.url());
  const otherCard = other.getByRole('article', {
    name: 'Reading',
    exact: true,
  });
  await expect(
    otherCard.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).toBeChecked();
  await card
    .getByRole('checkbox', { name: 'Read a chapter', exact: true })
    .uncheck();
  await expect(
    otherCard.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).not.toBeChecked();
  await other.close();
  await page.reload();
  await expect(
    card.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).not.toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath('task-widget-mobile.png'),
    fullPage: true,
  });
  await card
    .getByRole('button', { name: 'Manage tasks Reading', exact: true })
    .click();
  await tasks
    .getByRole('textbox', { name: 'Task', exact: true })
    .fill('Keep this draft during focus.');
  const focusTab = await context.newPage();
  await focusTab.goto(page.url());
  await focusTab
    .getByRole('button', { name: 'Focus mode', exact: true })
    .click();
  await focusTab
    .getByRole('button', { name: 'Start focus', exact: true })
    .click();
  await expect(
    focusTab.getByRole('region', { name: 'Focus timer', exact: true }),
  ).toBeVisible();
  await expect(
    tasks.getByRole('textbox', { name: 'Task', exact: true }),
  ).toHaveValue('Keep this draft during focus.');
  await focusTab
    .getByRole('button', { name: 'End focus', exact: true })
    .click();
  await focusTab.close();
  await tasks
    .getByRole('checkbox', { name: 'Read a chapter', exact: true })
    .check();
  page.once('dialog', (dialog) => dialog.accept());
  await tasks
    .getByRole('button', { name: 'Remove completed tasks', exact: true })
    .click();
  await expect(
    tasks.getByRole('checkbox', { name: 'Read a chapter', exact: true }),
  ).toHaveCount(0);
  await expect(
    tasks.getByRole('textbox', { name: 'Task', exact: true }),
  ).toHaveValue('Keep this draft during focus.');
  await expect(
    tasks.getByRole('checkbox', { name: 'Write a reading note', exact: true }),
  ).toBeVisible();
  await tasks
    .getByRole('button', {
      name: 'Remove task Write a reading note',
      exact: true,
    })
    .click();
  await expect(
    tasks
      .getByRole('list', { name: 'Tasks', exact: true })
      .getByRole('listitem'),
  ).toHaveCount(0);
  await tasks.getByRole('button', { name: 'Done', exact: true }).click();
});
