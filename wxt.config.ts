import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  entrypointsDir: '../entrypoints',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'StickySite — Save Filters & Form Presets',
    description: 'Save and restore search filters, form presets, and custom page views on any site in one click. Fast, private, and local-first.',
    version: '1.0.2',
    permissions: ['storage', 'scripting', 'activeTab', 'tabs', 'favicon'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
