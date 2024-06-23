import crypto from 'node:crypto';
import { env, window } from 'vscode';

export function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * read selected text from active editor or clipboard
 */
export async function getSelectedText(readClipboard = false) {
  const editor = window.activeTextEditor;
  if (!editor) {
    return readClipboard ? env.clipboard.readText() : '';
  }
  const selection = editor.selection;
  return editor.document.getText(selection);
}
