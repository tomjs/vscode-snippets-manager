import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdirp, rm, writeFile } from '@tomjs/node';
import { getAllWorkspaceFolders, getCtx, i18n } from '@tomjs/vscode';
import cloneDeep from 'lodash/cloneDeep';
import type { QuickPickItem, TextDocument } from 'vscode';
import {
  commands,
  languages,
  QuickPickItemKind,
  TabInputText,
  Uri,
  window,
  workspace,
} from 'vscode';
import {
  deleteSnippet,
  getGroupIconPath,
  getGroups,
  isLanguageGroup,
  SUFFIX_CODE_SNIPPETS,
  SUFFIX_JSON,
  writeSnippetFile,
} from './data';
import { closeSnippetPanel, openSnippetPanel } from './panel';
import type { GroupTreeItem, SnippetTreeItem } from './provider';
import { provider } from './provider';
import type { Group, PostData, Snippet } from './types';
import { GroupType } from './types';
import {
  array2Text,
  getCodeState,
  getLanguages,
  getLanguageTag,
  getSnippetLanguage,
  getUserSnippetsPath,
  showError,
  showInfo,
  showPickYesOrNo,
  text2Array,
  updateCodeState,
} from './utils';

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
    commands.registerCommand('tomjs.snippets.editSnippetBody', editSnippetBodyCommand),
    commands.registerCommand('tomjs.snippets.deleteSnippet', deleteSnippetCommand),
    commands.registerCommand('tomjs.snippets.copySnippet', copySnippetCommand),
  );

  workspace.onDidSaveTextDocument(onDidSaveTextDocument);

  setCodeSnippetLanguage();
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

  closeSnippetFile();
  closeSnippetPanel();

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

  closeSnippetFile();
  closeSnippetPanel();

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

  closeSnippetFile();
  closeSnippetPanel();

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

const codeSnippetDir = path.join(os.homedir(), '.tomjs/vscode-snippets-manager');
export const codeSnippetFile = path.join(codeSnippetDir, 'code.snippet');
export const fixFilePath = (fileName: string) => fileName.toLocaleLowerCase();
export const codeSnippetFileLower = fixFilePath(codeSnippetFile);
async function openSnippetFile(group: Group, snippet: Snippet) {
  await mkdirp(codeSnippetDir);

  const language = getSnippetLanguage(
    group.type === GroupType.language ? group.name : snippet.scope,
  );

  await updateCodeState({
    name: snippet.name,
    filePath: group.filePath,
    language,
  });

  let code = '';
  if (Array.isArray(snippet.body)) {
    code = snippet.body.join('\n');
  }

  await writeFile(codeSnippetFile, code);
  const editor = await window.showTextDocument(Uri.file(codeSnippetFile), { preview: true });
  try {
    if (language) {
      await languages.setTextDocumentLanguage(editor.document, language);
    }
  } catch (e) {
    console.error(e);
  }
}

function closeSnippetFile() {
  for (const tabGroup of window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof TabInputText) {
        const fileName = tab.input.uri.fsPath;
        if (fixFilePath(fileName) === codeSnippetFileLower) {
          window.tabGroups.close(tab);
          return;
        }
      }
    }
  }
}

async function addSnippetCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  closeSnippetFile();

  const languages = isLanguageGroup(group) ? [] : await getLanguages([], true);
  await openSnippetPanel(i18n.t('text.addSnippet.title')).postMessage<PostData>('snippet', {
    snippet: {
      name: '',
      prefix: '',
      body: [],
      filePath: group.filePath,
    },
    languages,
    names: group.snippets?.map(s => s.name) || [],
  });
}

async function editSnippetBodyCommand(group?: Group, snippet?: Snippet) {
  if (!group) group = await pickGroup();
  if (!group) return;

  if (!snippet) snippet = await pickSnippet(group);
  if (!snippet) return;

  closeSnippetPanel();
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

  await deleteSnippet(group, snippet.name);
  showInfo(i18n.t('text.delete.success', snippet.name));
  await provider.refresh(group.filePath);
}

export async function openEditSnippetPanel(group: Group, snippet: Snippet) {
  closeSnippetFile();

  const scopes = (snippet.scope || '').split(',').map(s => s.trim());
  const languages = isLanguageGroup(group) ? [] : await getLanguages(scopes, true);
  await openSnippetPanel(snippet.name).postMessage<PostData>('snippet', {
    snippet: { ...snippet, filePath: group.filePath },
    languages,
    names: group.snippets?.map(s => s.name) || [],
  });
}

async function editSnippetCommand(treeItem?: SnippetTreeItem) {
  let { group, snippet } = treeItem || {};
  if (!treeItem) {
    group = await pickGroup();
    if (!group) return;
    snippet = await pickSnippet(group);
  }
  if (!group || !snippet) return;

  await openEditSnippetPanel(group, snippet);
}

async function copySnippetCommand(treeItem?: SnippetTreeItem) {
  let { group, snippet } = treeItem || {};
  if (!treeItem) {
    group = await pickGroup();
    if (!group) return;
    snippet = await pickSnippet(group);
  }
  if (!group || !snippet) return;

  const newSnippet = cloneDeep(snippet);
  newSnippet.name = `${snippet.name}-${Date.now()}`;

  group.snippets.push(newSnippet);

  await writeSnippetFile(group.filePath, group.snippets);
  showInfo(i18n.t('text.copy.success', snippet.name));
  await provider.refresh(group.filePath);
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
    const state = getCodeState();
    if (!state) return;

    const groupPath = fixFilePath(state.filePath);
    const group = getGroups().find(g => fixFilePath(g.filePath) === groupPath);
    if (!group || !Array.isArray(group.snippets)) return;

    const snippet = group.snippets.find(s => s.name === state.name);
    if (snippet) {
      if (array2Text(snippet.body) !== doc.getText()) {
        snippet.body = text2Array(doc.getText());
        await writeSnippetFile(group.filePath, group.snippets);
        showInfo(i18n.t('text.save.success', snippet.name));
      }
    }
  }
}

async function setCodeSnippetLanguage() {
  // state
  const state = getCodeState();
  if (!state || !state.language) return;
  for (const doc of workspace.textDocuments) {
    if (fixFilePath(doc.fileName) === codeSnippetFileLower) {
      try {
        await languages.setTextDocumentLanguage(doc, state.language);
      } catch {}
      break;
    }
  }
}
