import path from 'node:path';
import vscode from '@tomjs/vite-plugin-vscode';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(env => {
  process.env.APP_BUILD_TIME = Date.now() + '';
  process.env.APP_VERSION = pkg.version;

  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'webview'),
      },
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag.startsWith('vscode-'),
          },
        },
      }),
      vscode({
        extension: {
          entry: 'src/index.ts',
          noExternal: env.command == 'build' ? Object.keys(pkg.dependencies) : [],
          minify: false,
        },
      }),
    ],
  };
});
