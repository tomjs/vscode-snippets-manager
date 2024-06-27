import { getCtx } from '@tomjs/vscode';
import type { CodeState } from '../types';

const CODE_KEY = 'code_state';
const USED_LANGUAGES_KEY = 'used_Languages';

export function getCodeState(): CodeState | undefined {
  return getCtx().globalState.get(CODE_KEY);
}

export function updateCodeState(snippet: CodeState) {
  return getCtx().globalState.update(CODE_KEY, snippet);
}

export function getUsedLanguagesState(): string[] {
  return getCtx().globalState.get(USED_LANGUAGES_KEY) || [];
}

export function updateUsedLanguagesState(langs: string[]) {
  return getCtx().globalState.update(USED_LANGUAGES_KEY, [
    ...new Set([...langs, ...getUsedLanguagesState()]),
  ]);
}
