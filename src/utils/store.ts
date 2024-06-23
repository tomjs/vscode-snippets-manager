import { getCtx } from '@tomjs/vscode';
import type { CodeStore } from '../types';

const CODE_KEY = 'code_state';
const USED_LANGUAGES_KEY = 'used_Languages';

export function getStoreCodeState(): CodeStore | undefined {
  return getCtx().globalState.get(CODE_KEY);
}

export function updateStoreCodeState(snippet: CodeStore) {
  return getCtx().globalState.update(CODE_KEY, snippet);
}

export function getStoreUsedLanguages(): string[] {
  return getCtx().globalState.get(USED_LANGUAGES_KEY) || [];
}

export function updateStoreUsedLanguages(langs: string[]) {
  return getCtx().globalState.update(USED_LANGUAGES_KEY, [
    ...new Set([...langs, ...getStoreUsedLanguages()]),
  ]);
}
