import type { App } from 'vue';
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  locale: navigator.language,
  fallbackLocale: 'en',
  legacy: false,
  messages: {
    en: {
      submit: 'Submit',
      reset: 'Reset',
      rule: {
        required: 'the field is required',
        min: 'The field must be at least {0} characters',
        min_select: 'The field must be selected at least {0} items',
      },
    },
    'zh-CN': {
      submit: '提交',
      reset: '重置',
      rule: {
        required: '它是必须的',
        min: '它必须至少有{0}个字符',
        min_select: '它必须至少选择{0}项',
      },
    },
  },
});

export function registerI18n(app: App) {
  app.use(i18n);
}
