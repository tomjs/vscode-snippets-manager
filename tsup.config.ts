import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig(options => {
  return {
    entry: ['src/index.ts'],
    format: ['cjs'],
    target: 'node14',
    external: ['vscode'],
    noExternal: options.watch ? [] : Object.keys(pkg.dependencies),
    clean: true,
    splitting: true,
    sourcemap: !!options.watch,
  };
});
