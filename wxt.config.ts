import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.wasm'],
  }),
  manifest: {
    name: 'ChromeWave',
    description: 'Record tab audio with waveform editing and DAW export',
    permissions: ['tabCapture', 'storage', 'downloads', 'unlimitedStorage'],
    action: {},
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
});
