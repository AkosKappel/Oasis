import type { browser } from 'wxt/browser';
import { captureTab } from './capture-tab';

export function captureEditorFragment(
  tab: { title?: string; url?: string },
  linkUrl?: string,
): string {
  try {
    const input = captureTab(linkUrl ? { url: linkUrl } : tab);
    return new URLSearchParams({
      url: input.url,
      title: input.title,
    }).toString();
  } catch (cause) {
    return new URLSearchParams({
      error:
        cause instanceof Error
          ? cause.message
          : 'This page could not be captured.',
    }).toString();
  }
}
export function registerCaptureActions(api: typeof browser) {
  const install = async () => {
    await api.contextMenus.removeAll();
    api.contextMenus.create({
      id: 'oasis-save-page',
      title: 'Save page to Oasis',
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
    api.contextMenus.create({
      id: 'oasis-save-link',
      title: 'Save link to Oasis',
      contexts: ['link'],
      targetUrlPatterns: ['http://*/*', 'https://*/*'],
    });
  };
  const installSafely = () => {
    void install().catch(() =>
      console.error('Oasis could not create its context menus.'),
    );
  };
  api.runtime.onInstalled.addListener(installSafely);
  api.runtime.onStartup.addListener(installSafely);
  const open = async (
    tab: { title?: string; url?: string },
    linkUrl?: string,
  ) => {
    await api.tabs.create({
      url: `${api.runtime.getURL('/capture.html')}#${captureEditorFragment(tab, linkUrl)}`,
    });
  };
  api.contextMenus.onClicked.addListener((info, tab) => {
    if (
      info.menuItemId !== 'oasis-save-page' &&
      info.menuItemId !== 'oasis-save-link'
    )
      return;
    void open(
      { title: tab?.title, url: info.pageUrl ?? tab?.url },
      info.menuItemId === 'oasis-save-link' ? info.linkUrl : undefined,
    ).catch(() => console.error('Oasis could not open its capture page.'));
  });
  api.commands.onCommand.addListener((command) => {
    if (command !== 'oasis-save-page') return;
    void api.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => open(tabs[0] ?? {}))
      .catch(() => console.error('Oasis could not open its capture page.'));
  });
}
