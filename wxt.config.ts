import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
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
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
