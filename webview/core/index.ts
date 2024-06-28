import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';

const i18nInstance = createI18n({
  locale: navigator.language,
  fallbackLocale: 'en',
  legacy: false,
  messages: {
    en,
    'zh-CN': zhCN,
  },
});

const i18n = i18nInstance as typeof i18nInstance & { t: typeof i18nInstance.global.t };
i18n.t = i18n.global.t;

export { i18n };

export function registerI18n(app: App) {
  app.use(i18nInstance);
}
