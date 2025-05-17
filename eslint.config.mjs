import { defineConfig } from '@tomjs/eslint';

export default defineConfig({
  type: 'app',
  rules: {
    'n/prefer-global/process': 'off',
  },
});
