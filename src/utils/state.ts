import { getCtx } from '@tomjs/vscode';
import type { CodeSnippetState } from '../types';

const CODE_KEY = 'code_state';
const CODE_PAGE_KEY = 'code_page_state';
const USED_LANGUAGES_KEY = 'used_Languages';

export function getCodeSnippetState(): CodeSnippetState | undefined {
  return getCtx().globalState.get(CODE_KEY);
}

export function updateCodeSnippetState(snippet: CodeSnippetState) {
  return getCtx().globalState.update(CODE_KEY, snippet);
}

export function getCodePageState(): CodeSnippetState | undefined {
  return getCtx().globalState.get(CODE_PAGE_KEY);
}

export function updateCodePageState(snippet: CodeSnippetState) {
  return getCtx().globalState.update(CODE_PAGE_KEY, snippet);
}

export function getUsedLanguagesState(): string[] {
  return getCtx().globalState.get(USED_LANGUAGES_KEY) || [];
}

export function updateUsedLanguagesState(langs: string[]) {
  return getCtx().globalState.update(USED_LANGUAGES_KEY, [
    ...new Set([...langs, ...getUsedLanguagesState()]),
  ]);
}
