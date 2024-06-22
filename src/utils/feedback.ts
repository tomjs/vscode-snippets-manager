import { i18n } from '@tomjs/vscode';
import { window } from 'vscode';

export function showWarn(message: string, ...items: string[]) {
  return window.showWarningMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}

export function showError(message: string, ...items: string[]) {
  return window.showErrorMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}

export function showInfo(message: string, ...items: string[]) {
  return window.showInformationMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}
