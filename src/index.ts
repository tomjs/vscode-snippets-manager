import { initExtension } from '@tomjs/vscode';
import type { ExtensionContext } from 'vscode';
import { registerCommands } from './commands';
import { searchGroupSnippets } from './data';
import { createSnippetsManagerTreeView } from './provider';

export async function activate(context: ExtensionContext) {
  initExtension(context);

  await searchGroupSnippets();

  registerCommands();
  createSnippetsManagerTreeView();
}

export function deactivate() {}
