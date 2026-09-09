import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'StickySite',
    description: 'Save and restore exact web page views and form state',
    version: '1.0.0',
    permissions: ['storage', 'scripting'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
