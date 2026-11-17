import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  zip: { zipSources: false },
  targetBrowsers: ['chrome', 'edge', 'firefox'],
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => ({
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{6606897f-90af-4ce1-8257-177e15db756b}',
              strict_min_version: '140.0',
            },
          },
        }
      : {}),
    name: 'Oasis',
    description: 'Your personal space on the web.',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: { default_icon: { 16: 'icon/16.png', 32: 'icon/32.png' } },
    permissions: ['activeTab', 'contextMenus'],
    optional_permissions: ['scripting', 'tabs'],
    optional_host_permissions: [
      'https://api.open-meteo.com/*',
      'https://geocoding-api.open-meteo.com/*',
    ],
    commands: {
      'oasis-save-page': {
        suggested_key: { default: 'Alt+Shift+O' },
        description: 'Save the current page to Oasis',
      },
    },
  }),
  vite: () => ({ plugins: [tailwindcss()] }),
});
