import { getCtx, i18n } from '@tomjs/vscode';
import { ExtensionMode, languages, window } from 'vscode';
import type { LanguageItem } from '../types';
import { getPropsFixedLanguages, getPropsScopeLanguages } from './configuration';
import { getUsedLanguagesState } from './state';

export function getCurrentLanguage() {
  const editor = window.activeTextEditor;
  if (editor) return editor.document.languageId;
}

const TS_GROUPS = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
const REACT_GROUPS = ['typescriptreact', 'typescript', 'javascriptreact', 'javascript'];

function getCurrentLanguages() {
  const lang = getCurrentLanguage();
  if (!lang || lang === 'plaintext') {
    return [];
  }

  if (lang.startsWith('javascript') || lang.startsWith('typescript')) {
    return TS_GROUPS;
  }

  return [lang];
}

export function getSnippetLanguage(scope?: string) {
  if (!scope) return;

  const langs = (scope || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s);

  for (const langId of REACT_GROUPS) {
    if (langs.includes(langId)) {
      return fixSnippetLanguage(langId);
    }
  }

  return fixSnippetLanguage(langs[0]);
}

export function isUnderDevelopment() {
  return getCtx().extensionMode === ExtensionMode.Development;
}

function fixSnippetLanguage(lang?: string) {
  if (!lang) return;

  if (isUnderDevelopment()) {
    if (['vue', 'svg'].includes(lang)) {
      return 'html';
    }
  } else {
    if (['svg'].includes(lang)) {
      return 'html';
    }
  }

  return lang || undefined;
}

export function getLanguageTag(item: LanguageItem) {
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

export async function getLanguages(selectedLanguages?: string[], showScopeLanguages?: boolean) {
  let langs: string[] = [];
  if (showScopeLanguages) {
    langs = getPropsScopeLanguages();
  }
  if (langs.length === 0) {
    langs = await languages.getLanguages();
  }

  if (Array.isArray(selectedLanguages)) {
    langs = langs.concat(selectedLanguages);
  }
  const set = new Set(langs);

  let selectedLangs = Array.isArray(selectedLanguages) ? selectedLanguages : [];
  if (
    selectedLangs.length &&
    selectedLangs.find(s => ['javascript', 'typescript'].find(l => s.startsWith(l)))
  ) {
    selectedLangs = TS_GROUPS;
  }
  const currentLangs = getCurrentLanguages();
  const propsLangs = getPropsFixedLanguages();
  const usedLangs = getUsedLanguagesState();
  const firstLangs: string[] = [
    ...new Set([...selectedLangs, ...currentLangs, ...propsLangs, ...usedLangs]),
  ];
  firstLangs.forEach(lang => {
    set.delete(lang);
  });

  langs = Array.from(set);
  langs.sort();

  if (firstLangs.length) langs.unshift(...firstLangs);

  return langs.map((s): LanguageItem => {
    return {
      lang: s,
      current: currentLangs.includes(s),
      user: propsLangs.includes(s),
      used: usedLangs.includes(s),
    };
  });
}
