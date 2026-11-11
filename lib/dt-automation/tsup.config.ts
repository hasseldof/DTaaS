import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  entry: ['index.ts'],
  // Reject Node.js built-in imports; tsup marks `node:` imports external
  // unless removeNodeProtocol is false.
  platform: 'neutral',
  removeNodeProtocol: false,
  dts: false,
  clean: true,
});
