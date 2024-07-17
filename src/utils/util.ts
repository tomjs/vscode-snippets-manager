import crypto from 'node:crypto';
import { env, window } from 'vscode';

export function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function array2Text(text?: any): string {
  if (Array.isArray(text)) {
    return text.join('\n');
  }

  return text || '';
}

export function text2Array(text?: any): string[] {
  if (Array.isArray(text)) {
    return [...text];
  }

  if (!text || typeof text !== 'string') {
    return [];
  }

  return text.split('\n');
}

export function indentCode(text: string) {
  const lines = text.split('\n');
  let minIndent = Infinity;
  for (const line of lines) {
    const match = line.match(/^\s*/);
    if (!match || match.length == 0) continue;

    const indent = match[0].length;
    if (indent < minIndent) minIndent = indent;
  }
  if (minIndent != Infinity) {
    text = lines.map(x => x.slice(minIndent)).join('\n');
  }
  return text;
}

/**
 * read selected text from active editor or clipboard
 */
export async function getSelectedText(readClipboard = false) {
  const editor = window.activeTextEditor;

  let text = '';
  if (editor) {
    const selection = editor.selection;
    text = editor.document.getText(selection);
  } else if (readClipboard) {
    text = await env.clipboard.readText();
  }

  return indentCode(text);
}
