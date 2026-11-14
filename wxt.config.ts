import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Oasis',
    description: 'Your personal space on the web.',
    permissions: ['activeTab'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
