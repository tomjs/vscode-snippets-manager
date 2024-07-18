import { i18n } from '@tomjs/vscode';
import { window } from 'vscode';

export function showWarn(message: any, ...items: string[]) {
  return window.showWarningMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}

export function showError(message: any, ...items: string[]) {
  return window.showErrorMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}

export function showInfo(message: any, ...items: string[]) {
  return window.showInformationMessage(`${i18n.t('displayName')}: ${message}`, ...items);
}

export async function showPickYesOrNo(placeHolder: string) {
  const result = await window.showQuickPick([i18n.t('feedback.yes'), i18n.t('feedback.no')], {
    placeHolder,
  });

  if (result) {
    return result === i18n.t('feedback.yes');
  }
}
