import { getCtx } from '@tomjs/vscode';
import { commands } from 'vscode';
import { provider } from './provider';

export function registerCommands() {
  getCtx().subscriptions.push(
    // groups
    commands.registerCommand('tomjs.snippets.addGroup', addGroup),
    commands.registerCommand('tomjs.snippets.editGroup', editGroup),
    commands.registerCommand('tomjs.snippets.deleteGroup', deleteGroup),
    commands.registerCommand('tomjs.snippets.renameGroup', renameGroup),
    commands.registerCommand('tomjs.snippets.refresh', refreshGroup),
    // snippet
    commands.registerCommand('tomjs.snippets.addSnippet', addSnippet),
    commands.registerCommand('tomjs.snippets.editSnippet', editSnippet),
    commands.registerCommand('tomjs.snippets.deleteSnippet', deleteSnippet),
    commands.registerCommand('tomjs.snippets.renameSnippet', renameSnippet),
  );
}

/* #region groups */

function addGroup() {}

function editGroup() {}

function deleteGroup() {}

function renameGroup() {}

async function refreshGroup() {
  await provider.refresh();
}

/* #endregion */

/* #region snippets */

function addSnippet() {}

function editSnippet() {}

function deleteSnippet() {}

function renameSnippet() {}

/* #endregion */
