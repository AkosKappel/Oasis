import { expect, it, vi } from 'vitest';
import type { browser } from 'wxt/browser';
import {
  captureEditorFragment,
  registerCaptureActions,
} from './capture-actions';

it('prefills pages/links and rejects unsafe capture targets', () => {
  const page = new URLSearchParams(
    captureEditorFragment({ title: 'A page', url: 'https://example.com' }),
  );
  expect(page.get('title')).toBe('A page');
  expect(page.get('url')).toBe('https://example.com/');
  const link = new URLSearchParams(
    captureEditorFragment(
      { title: 'Page title' },
      'https://docs.example.com/topic',
    ),
  );
  expect(link.get('title')).toBe('docs.example.com');
  expect(
    new URLSearchParams(
      captureEditorFragment({ url: 'javascript:alert(1)' }),
    ).has('error'),
  ).toBe(true);
});
it('registers menus and dispatches page, link and keyboard capture through the same editor', async () => {
  let installed!: () => void;
  let clicked!: (
    info: { menuItemId: string; pageUrl?: string; linkUrl?: string },
    tab?: { title?: string },
  ) => void;
  let command!: (name: string) => void;
  const create = vi.fn().mockResolvedValue({});
  const menus = vi.fn();
  const api = {
    runtime: {
      onInstalled: { addListener: (fn: () => void) => (installed = fn) },
      onStartup: { addListener: vi.fn() },
      getURL: (path: string) => `chrome-extension://test${path}`,
    },
    contextMenus: {
      removeAll: vi.fn().mockResolvedValue(undefined),
      create: menus,
      onClicked: { addListener: (fn: typeof clicked) => (clicked = fn) },
    },
    commands: {
      onCommand: { addListener: (fn: typeof command) => (command = fn) },
    },
    tabs: {
      create,
      query: vi
        .fn()
        .mockResolvedValue([
          { title: 'Keyboard page', url: 'https://example.com' },
        ]),
    },
  };
  registerCaptureActions(api as unknown as typeof browser);
  installed();
  await vi.waitFor(() => expect(menus).toHaveBeenCalledTimes(2));
  clicked(
    { menuItemId: 'oasis-save-page', pageUrl: 'https://example.com' },
    { title: 'Page' },
  );
  clicked({
    menuItemId: 'oasis-save-link',
    linkUrl: 'https://other.example.com',
  });
  command('oasis-save-page');
  await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(3));
  expect(
    create.mock.calls.every(([value]) =>
      value.url.startsWith('chrome-extension://test/capture.html#'),
    ),
  ).toBe(true);
});
