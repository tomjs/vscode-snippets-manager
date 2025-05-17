import type { PostData } from '../types';
import { getCtx } from '@tomjs/vscode';

const USED_LANGUAGES_KEY = 'used_Languages';

let codePageState: PostData;
export function setCodePagePostData(state: PostData) {
  return (codePageState = state);
}

export function getCodePagePostData(): PostData {
  return codePageState;
}

export function getUsedLanguagesState(): string[] {
  return getCtx().globalState.get(USED_LANGUAGES_KEY) || [];
}
