module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [require.resolve('@tomjs/eslint/vue')],
  overrides: [
    {
      files: ['src/**/*.ts'],
      extends: [require.resolve('@tomjs/eslint')],
    },
  ],
};
