import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    dts: true,
    clean: false,
    platform: 'node',
  },
  {
    entry: { client: 'src/client.ts' },
    outDir: 'dist',
    format: ['cjs'],
    clean: false,
    platform: 'browser',
    external: ['react'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    banner: 'window.__ModuleLoader__.load({ id: "dsh-gentle-engram", factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
])
