import type { UserConfig } from '../types';
import { Configuration } from '@tomjs/vscode';

export const configuration = new Configuration<UserConfig>('tomjs.snippets', {
  fixedLanguages: [],
  scopeLanguages: [],
});

function getArrayValue(key: string) {
  const v = configuration.get(key);
  return Array.isArray(v) ? v : [];
}

export function getPropsFixedLanguages(): string[] {
  return getArrayValue('fixedLanguages');
}

export async function updatePropsFixedLanguages(langs: string[]) {
  await configuration.update('fixedLanguages', langs);
}

export function getPropsScopeLanguages(): string[] {
  return getArrayValue('scopeLanguages');
}

export async function updatePropScopeLanguages(langs: string[]) {
  await configuration.update('scopeLanguages', langs);
}
