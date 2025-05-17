import type { ExtensionContext } from 'vscode';
import { initExtension } from '@tomjs/vscode';
import { registerCommands } from './commands';
import { searchGroupSnippets } from './data';
import { createSnippetsManagerTreeView } from './provider';

export async function activate(context: ExtensionContext) {
  initExtension(context);

  await searchGroupSnippets();

  createSnippetsManagerTreeView();
  registerCommands();
}

export async function deactivate() {}
