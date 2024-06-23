import { i18n } from '@tomjs/vscode';
import { languages, window } from 'vscode';
import { getPropsFixedLanguages } from './configuration';
import { getStoreUsedLanguages } from './store';

export function getCurrentLanguage() {
  const editor = window.activeTextEditor;
  if (editor) return editor.document.languageId;
}

function getCurrentLanguages() {
  const lang = getCurrentLanguage();
  if (!lang || lang === 'plaintext') {
    return [];
  }

  if (lang === 'javascriptreact') {
    return ['javascriptreact'];
  }

  if (lang === 'typescriptreact') {
    return ['typescriptreact', 'javascriptreact'];
  }

  if (lang === 'typescript') {
    return ['typescript', 'typescriptreact'];
  }

  if (lang === 'javascript') {
    return ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
  }

  return [lang];
}

export function getSnippetLanguage(langs: string[]) {
  const list = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
  for (const langId of list) {
    if (langs.includes(langId)) {
      return langId;
    }
  }

  return langs[0];
}

export interface languageItem {
  lang: string;
  current?: boolean;
  user?: boolean;
  used?: boolean;
}

export function getLanguageTag(item: languageItem) {
  const tags: string[] = [];
  if (item.current) {
    tags.push(i18n.t('text.word.current'));
  }

  if (item.used) {
    tags.push(i18n.t('text.word.used'));
  }

  if (item.user) {
    tags.push(i18n.t('text.word.fixed'));
  }
  return tags.join(' / ');
}

export async function getLanguages(additionalLanguages?: string[]) {
  let langs = await languages.getLanguages();
  if (Array.isArray(additionalLanguages)) {
    langs = langs.concat(additionalLanguages);
  }
  const set = new Set(langs);

  const currentLangs = getCurrentLanguages();
  const propsLangs = getPropsFixedLanguages();
  const usedLangs = getStoreUsedLanguages();
  const firstLangs: string[] = [...new Set([...currentLangs, ...propsLangs, ...usedLangs])];
  firstLangs.forEach(lang => {
    set.delete(lang);
  });

  langs = Array.from(set);
  langs.sort();

  if (firstLangs.length) langs.unshift(...firstLangs);

  return langs.map((s): languageItem => {
    return {
      lang: s,
      current: currentLangs.includes(s),
      user: propsLangs.includes(s),
      used: usedLangs.includes(s),
    };
  });
}
