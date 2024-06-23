import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdirp, rm, writeFile } from '@tomjs/node';
import { getAllWorkspaceFolders, getCtx, i18n } from '@tomjs/vscode';
import jsonc from 'comment-json';
import type { QuickPickItem, TextDocument } from 'vscode';
import { commands, languages, QuickPickItemKind, Uri, window, workspace } from 'vscode';
import {
  getGroupIconPath,
  getGroups,
  isLanguageGroup,
  SUFFIX_CODE_SNIPPETS,
  SUFFIX_JSON,
} from './data';
import type { GroupTreeItem, SnippetTreeItem } from './provider';
import { provider } from './provider';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import {
  getLanguages,
  getLanguageTag,
  getSelectedText,
  getSnippetLanguage,
  getUserSnippetsPath,
  showError,
  showInfo,
  showPickYesOrNo,
} from './utils';
import { getStoreCodeState, updateStoreCodeState, updateStoreUsedLanguages } from './utils/store';

export function registerCommands() {
  getCtx().subscriptions.push(
    // groups
    commands.registerCommand('tomjs.snippets.addGroup', addGroupCommand),
    commands.registerCommand('tomjs.snippets.editGroup', editGroupCommand),
    commands.registerCommand('tomjs.snippets.deleteGroup', deleteGroupCommand),
    commands.registerCommand('tomjs.snippets.renameGroup', renameGroupCommand),
    commands.registerCommand('tomjs.snippets.refresh', refreshGroupCommand),
    // snippet
    commands.registerCommand('tomjs.snippets.addSnippet', addSnippetCommand),
    commands.registerCommand('tomjs.snippets.editSnippet', editSnippetCommand),
    commands.registerCommand('tomjs.snippets.deleteSnippet', deleteSnippetCommand),
    commands.registerCommand('tomjs.snippets.renameSnippet', renameSnippetCommand),
  );

  workspace.onDidSaveTextDocument(onDidSaveTextDocument);
}

async function pickGroup() {
  const pickItems: (QuickPickItem & { group: Group })[] = getGroups().map(group => {
    return {
      label: group.name,
      description: isLanguageGroup(group) ? undefined : group.filePath,
      iconPath: Uri.file(getGroupIconPath(group)),
      group,
    };
  });

  const item = await window.showQuickPick(pickItems, { placeHolder: i18n.t('text.selectGroup') });
  if (!item) {
    return;
  }
  return item.group;
}

function validateInputBox(values?: string[], oldValue?: string) {
  return (value: string) => {
    if (!value) {
      return i18n.t('rule.required');
    }
    if (!/^\S+(\s+\S+)*$/.test(value)) {
      return i18n.t('rule.whitespace');
    }

    if (oldValue && oldValue === value) {
      return;
    }

    if (Array.isArray(values) && values.includes(value)) {
      return i18n.t('rule.exist', value);
    }
  };
}

/* #region groups */
async function addGroupCommand() {
  const languages = await getLanguages();
  const groups = getGroups()
    .filter(s => s.type === GroupType.language)
    .map(s => s.name);

  const pickItems: (QuickPickItem & { type?: GroupType; destPath?: string })[] = [
    { label: i18n.t('text.addGroup.scope'), kind: QuickPickItemKind.Separator },
    {
      label: i18n.t('text.addGroup.global'),
      type: GroupType.global,
      iconPath: Uri.file(getGroupIconPath(GroupType.global)),
    },
    ...getAllWorkspaceFolders().map(s => ({
      label: i18n.t('text.addGroup.workspace', s.name),
      type: GroupType.workspace,
      iconPath: Uri.file(getGroupIconPath(GroupType.workspace)),
      destPath: s.uri.fsPath,
    })),
    {
      label: i18n.t('text.languageGroup'),
      kind: QuickPickItemKind.Separator,
    },
    ...languages
      .filter(s => !groups.includes(s.lang))
      .map(s => {
        return {
          label: s.lang,
          description: getLanguageTag(s),
          type: GroupType.language,
          iconPath: Uri.file(getGroupIconPath(GroupType.language)),
        };
      }),
  ];

  const pickGroup = await window.showQuickPick(pickItems, {
    placeHolder: i18n.t('text.selectGroupType'),
  });
  if (!pickGroup) {
    return;
  }

  let fileName: string = '';
  if (pickGroup.type === GroupType.language) {
    fileName = pickGroup.label + SUFFIX_JSON;
  } else {
    const names = getGroups()
      .filter(s => s.type === pickGroup.type)
      .map(s => s.name);

    const groupName = await window.showInputBox({
      title: i18n.t('text.addGroup.name'),
      validateInput: validateInputBox(names),
    });
    if (!groupName) {
      return;
    }
    fileName = groupName + SUFFIX_CODE_SNIPPETS;
  }

  if (!fileName) {
    return;
  }

  const destDir: string =
    pickGroup.type === GroupType.workspace
      ? path.join(pickGroup.destPath!, '.vscode')
      : getUserSnippetsPath();
  const dest = path.join(destDir, fileName);
  if (fs.existsSync(dest)) {
    showError(i18n.t('rule.exist', pickGroup.label));
    return;
  }

  await mkdirp(destDir);
  await writeFile(path.join(destDir, fileName), '{}');
  showInfo(i18n.t('text.add.success', fileName.substring(0, fileName.lastIndexOf('.'))));
  await provider.refresh();
}

async function editGroupCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  window.showTextDocument(Uri.file(group.filePath));
}

async function deleteGroupCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  const confirm = await showPickYesOrNo(i18n.t('text.delete.confirm', group.name));
  if (!confirm) return;

  await rm(group.filePath);

  showInfo(i18n.t('text.delete.success', group.name));

  await provider.refresh();
}

async function renameGroupCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  const names = getGroups()
    .filter(
      s =>
        s.type === group.type &&
        path.dirname(s.filePath) === path.dirname(group.filePath) &&
        s.name !== group.name,
    )
    .map(s => s.name);

  const newName = await window.showInputBox({
    title: i18n.t('text.renameGroup.name'),
    validateInput: validateInputBox(names, group.name),
    value: group.name,
  });
  if (!newName || newName === group.name) {
    return;
  }

  fs.renameSync(
    group.filePath,
    path.join(
      path.dirname(group.filePath),
      `${newName}${group.type === GroupType.language ? SUFFIX_JSON : SUFFIX_CODE_SNIPPETS}`,
    ),
  );

  showInfo(i18n.t('text.rename.success', `${group.name} => ${newName}`));

  await provider.refresh();
}

async function refreshGroupCommand() {
  await provider.refresh();
}

/* #endregion */

/* #region snippets */

async function pickSnippet(group: Group) {
  const items: (QuickPickItem & { snippet: Snippet })[] = (group.snippets || []).map(s => ({
    label: s.prefix,
    description: s.description,
    snippet: s,
  }));

  const pick = await window.showQuickPick(items, {
    placeHolder: i18n.t('text.selectSnippet'),
  });

  if (pick) return pick.snippet;
}

async function addOrUpdateSnippet(group: Group, snippet: Snippet) {
  const { name, prefix, scope, body, description } = snippet;
  await writeFile(
    group.filePath,
    jsonc.stringify(
      jsonc.assign(group.json || {}, {
        [name]: {
          prefix,
          scope,
          body,
          description,
        },
      }),
      null,
      2,
    ),
  );
}

const codeSnippetDir = path.join(os.homedir(), '.tomjs/vscode-snippets-manager');
export const codeSnippetFile = path.join(codeSnippetDir, 'code.snippet');
export const fixFilePath = (fileName: string) => fileName.toLocaleLowerCase();
export const codeSnippetFileLower = fixFilePath(codeSnippetFile);
async function openSnippetFile(group: Group, snippet: Snippet) {
  await mkdirp(codeSnippetDir);

  const language = Array.isArray(snippet.scope) ? getSnippetLanguage(snippet.scope) : group.name;

  await updateStoreCodeState({
    name: snippet.name,
    filePath: group.filePath,
    language,
  });

  const code = snippet.body || '';
  await writeFile(codeSnippetFile, code);
  const editor = await window.showTextDocument(Uri.file(codeSnippetFile), { preview: true });
  try {
    await languages.setTextDocumentLanguage(editor.document, language);
  } catch {}
}

async function addSnippetCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  const names = (group.snippets || []).map(snippet => snippet.name);
  const prefixTitle = i18n.t('text.addSnippet.prefix');
  const prefix = await window.showInputBox({
    title: prefixTitle,
    placeHolder: prefixTitle,
    validateInput: validateInputBox(),
  });

  if (!prefix) {
    return;
  }

  const nameTitle = i18n.t('text.addSnippet.name');
  const name = await window.showInputBox({
    title: nameTitle,
    placeHolder: nameTitle,
    validateInput: validateInputBox(names),
    value: prefix,
  });

  if (!name) {
    return;
  }

  let scope: string[] | undefined;
  if (group.type !== GroupType.language) {
    const langs = await getLanguages();
    const result = await window.showQuickPick(
      langs.map(
        (s): QuickPickItem => ({
          label: s.lang,
          description: getLanguageTag(s),
          picked: s.current,
        }),
      ),
      {
        placeHolder: i18n.t('text.addSnippet.scope'),
        canPickMany: true,
      },
    );
    if (result) {
      scope = result.map(s => s.label);
      await updateStoreUsedLanguages(scope);
    }
  }

  const description = await window.showInputBox({
    title: i18n.t('text.addSnippet.description'),
  });

  const body = await getSelectedText(true);
  const snippet: Snippet = {
    name: name,
    prefix: prefix,
    description: description,
    body,
  };

  if (Array.isArray(scope)) {
    snippet.scope = scope.join(', ');
  }

  await addOrUpdateSnippet(group, snippet);
  showInfo(i18n.t('text.add.success', snippet.name));
  await openSnippetFile(group, snippet);
  await provider.refresh(treeItem);
}

async function editSnippetCommand(group?: Group, snippet?: Snippet) {
  if (!group) group = await pickGroup();
  if (!group) return;

  if (!snippet) snippet = await pickSnippet(group);
  if (!snippet) return;

  await openSnippetFile(group, snippet);
}

async function deleteSnippetCommand(treeItem?: SnippetTreeItem) {
  let { group, snippet } = treeItem || {};
  if (!treeItem) {
    group = await pickGroup();
    if (!group) return;
    snippet = await pickSnippet(group);
  }
  if (!group || !snippet) return;

  const confirm = await showPickYesOrNo(i18n.t('text.delete.confirm', snippet.name));
  if (!confirm) return;

  const snippets = group?.json;
  if (snippets) {
    delete snippets[snippet.name];
  }
  await writeFile(group.filePath, jsonc.stringify(snippets, null, 2));
  showInfo(i18n.t('text.delete.success', snippet.name));
  await provider.refresh(treeItem);
}

async function renameSnippetCommand(treeItem?: SnippetTreeItem) {
  let { group, snippet } = treeItem || {};
  if (!treeItem) {
    group = await pickGroup();
    if (!group) return;
    snippet = await pickSnippet(group);
  }
  if (!group || !snippet) return;

  const names = (group.snippets || []).map(snippet => snippet.name);

  const prefixTitle = i18n.t('text.addSnippet.prefix');
  const prefix = await window.showInputBox({
    title: prefixTitle,
    placeHolder: prefixTitle,
    value: snippet.prefix,
    validateInput: validateInputBox(),
  });

  if (!prefix) {
    return;
  }

  const nameTitle = i18n.t('text.addSnippet.name');
  const name = await window.showInputBox({
    title: nameTitle,
    placeHolder: nameTitle,
    validateInput: validateInputBox(names, snippet.name),
    value: snippet.name ?? prefix,
  });

  if (!name) {
    return;
  }

  let scope: string[] | undefined;
  if (group.type !== GroupType.language) {
    const langs = await getLanguages();
    const scopes = (snippet.scope || '').split(',').map(s => s.trim());
    const result = await window.showQuickPick(
      langs.map(
        (s): QuickPickItem => ({
          label: s.lang,
          description: getLanguageTag(s),
          picked: scopes.includes(s.lang),
        }),
      ),
      {
        placeHolder: i18n.t('text.addSnippet.scope'),
        canPickMany: true,
      },
    );
    if (result) {
      scope = result.map(s => s.label);
      await updateStoreUsedLanguages(scope);
    }
  }

  const tileDescription = i18n.t('text.addSnippet.description');
  const description = await window.showInputBox({
    title: tileDescription,
    placeHolder: tileDescription,
    value: snippet.description,
  });

  const newSnippet: Snippet = {
    name: name,
    prefix: prefix,
    description: description,
    body: snippet.body,
  };

  if (Array.isArray(scope)) {
    snippet.scope = scope.join(', ');
  }

  const snippets = group?.json;
  if (snippets) {
    delete snippets[snippet.name];
  }
  await addOrUpdateSnippet(group, newSnippet);
  showInfo(i18n.t('text.save.success', snippet.name));
  await provider.refresh(treeItem);
}

/* #endregion */

async function onDidSaveTextDocument(doc?: TextDocument) {
  if (!doc) return;

  const fileName = doc.fileName.toLocaleLowerCase();
  const groups = getGroups();
  if (groups.find(g => fixFilePath(g.filePath) === fileName)) {
    showInfo(i18n.t('text.save.success', fileName));
    provider.refresh();
  } else {
    if (fileName !== codeSnippetFileLower) {
      return;
    }
    // state
    const state = getStoreCodeState();
    if (!state) return;

    const groupPath = fixFilePath(state.filePath);
    const group = getGroups().find(g => fixFilePath(g.filePath) === groupPath);
    if (!group || !group.json) return;

    const snippet = (group.snippets || []).find(s => s.name === state.name);
    if (snippet) {
      snippet.body = doc.getText();
      await addOrUpdateSnippet(group, snippet);
      showInfo(i18n.t('text.save.success', snippet.name));
    }
  }
}
