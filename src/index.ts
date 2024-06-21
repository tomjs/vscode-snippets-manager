import { initExtension } from '@tomjs/vscode';
import type { ExtensionContext } from 'vscode';
import { createSnippetTreeView } from './provider';

export function activate(context: ExtensionContext) {
  initExtension(context);

  createSnippetTreeView();
}

export function deactivate() {}
