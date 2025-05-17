export default {
  '**/*.{vue,css,scss,html}': [
    'stylelint --fix',
  ],
  '*': 'eslint --fix',
};
