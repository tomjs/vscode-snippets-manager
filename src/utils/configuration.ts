import { Configuration } from '@tomjs/vscode';
import type { UserConfig } from '../types';

export const configuration = new Configuration<UserConfig>('tomjs.snippets', {
  fixedLanguages: [],
  scopeLanguages: [],
});

function getArrayValue(key: string) {
  const v = configuration.get(key);
  return Array.isArray(v) ? v : [];
}

export const getPropsFixedLanguages = (): string[] => {
  return getArrayValue('fixedLanguages');
};

export const updatePropsFixedLanguages = async (langs: string[]) => {
  await configuration.update('fixedLanguages', langs);
};

export const getPropsScopeLanguages = (): string[] => {
  return getArrayValue('scopeLanguages');
};

export const updatePropScopeLanguages = async (langs: string[]) => {
  await configuration.update('scopeLanguages', langs);
};
