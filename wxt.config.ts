import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Oasis',
    description: 'Your personal space on the web.',
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
