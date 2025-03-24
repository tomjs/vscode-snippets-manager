import fs from 'node:fs';
import path from 'node:path';
import { mkdirp, rm, writeFile } from '@tomjs/node';
import { getAllWorkspaceFolders, getCtx, i18n } from '@tomjs/vscode';
import { cloneDeep } from 'es-toolkit';
import type { QuickPickItem, TextDocument } from 'vscode';
import { commands, QuickPickItemKind, Uri, window, workspace } from 'vscode';
import { SUFFIX_CODE_SNIPPETS, SUFFIX_JSON } from './constant';
import { getGroupIconPath, getGroups, isLanguageGroup, writeSnippetFile } from './data';
import { closeSnippetPanel, openSnippetPanel } from './panel';
import type { GroupTreeItem, SnippetTreeItem } from './provider';
import { provider } from './provider';
import {
  clearExpiredCodeSnippetFiles,
  closeSnippetFile,
  fixFilePath,
  isCodeSnippetDir,
  openSnippetFile,
} from './snippet';
import type { Group, PostData, Snippet } from './types';
import { GroupType } from './types';
import {
  array2Text,
  getLanguages,
  getLanguageTag,
  getUserSnippetsPath,
  setCodePagePostData,
  shortId,
  showError,
  showInfo,
  showPickYesOrNo,
  text2Array,
} from './utils';

export async function registerCommands() {
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

  closeSnippetFile();
  workspace.onDidSaveTextDocument(onDidSaveTextDocument);

  clearExpiredCodeSnippetFiles();
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

function closeSnippetFileAndPanel() {
  closeSnippetFile();
  closeSnippetPanel();
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

  closeSnippetFileAndPanel();

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

  closeSnippetFileAndPanel();

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

  closeSnippetFileAndPanel();

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

async function deleteSnippet(group: Group, snippetName: string, writeFile = true) {
  const { snippets } = group;
  const i = snippets.findIndex(s => s.name === snippetName);
  if (i !== -1) {
    snippets.splice(i, 1);
  }

  if (writeFile) {
    await writeSnippetFile(group.filePath, snippets);
  }

  // close snippet file/panel
  closeSnippetFileAndPanel();
}

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

async function addSnippetCommand(treeItem?: GroupTreeItem) {
  let group = treeItem?.group;
  if (!group) {
    group = await pickGroup();
  }
  if (!group) return;

  closeSnippetFile();

  const languages = isLanguageGroup(group) ? [] : await getLanguages([], true);
  const postData: PostData = {
    snippet: {
      id: shortId(Date.now().toString()),
      name: '',
      prefix: '',
      body: [],
      filePath: group.filePath,
    },
    languages,
    names: group.snippets?.map(s => s.name) || [],
  };
  setCodePagePostData(postData);
  await openSnippetPanel(i18n.t('text.addSnippet.title')).postMessage<PostData>(
    'snippet',
    postData,
  );
}

async function editSnippetBodyCommand(group?: Group, snippet?: Snippet) {
  if (!group) group = await pickGroup();
  if (!group) return;

  if (!snippet) snippet = await pickSnippet(group);
  if (!snippet) return;

  closeSnippetFileAndPanel();
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

  closeSnippetFileAndPanel();

  showInfo(i18n.t('text.delete.success', snippet.name));
  await provider.refresh(group.filePath);
}

export async function openEditSnippetPanel(group: Group, snippet: Snippet) {
  closeSnippetFile();

  const scopes = (snippet.scope || '').split(',').map(s => s.trim());
  const languages = isLanguageGroup(group) ? [] : await getLanguages(scopes, true);
  const postData: PostData = {
    snippet: { ...snippet, filePath: group.filePath },
    languages,
    names: group.snippets?.map(s => s.name) || [],
  };

  setCodePagePostData(postData);

  await openSnippetPanel(snippet.name).postMessage<PostData>('snippet', postData);
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
  newSnippet.id = shortId(Date.now().toString());
  newSnippet.name = `${snippet.name}-${Date.now()}`;

  group.snippets.push(newSnippet);

  await writeSnippetFile(group.filePath, group.snippets);
  showInfo(i18n.t('text.copy.success', snippet.name));
  await provider.refresh(group.filePath);
}

/* #endregion */

async function onDidSaveTextDocument(doc?: TextDocument) {
  if (!doc) return;

  const filePath = doc.fileName.toLocaleLowerCase();
  const groups = getGroups();
  if (groups.find(g => fixFilePath(g.filePath) === filePath)) {
    showInfo(i18n.t('text.save.success', filePath));
    provider.refresh();
  } else {
    if (!isCodeSnippetDir(filePath)) {
      return;
    }
    const fileName = path.basename(filePath);
    const [groupId, snippetId] = fileName.split('.');
    const group = getGroups().find(g => g.id === groupId);
    if (!group || !Array.isArray(group.snippets)) return;

    const snippet = group.snippets.find(s => s.id === snippetId);
    if (snippet) {
      if (array2Text(snippet.body) !== doc.getText()) {
        snippet.body = text2Array(doc.getText());
        await writeSnippetFile(group.filePath, group.snippets);
        showInfo(i18n.t('text.save.success', snippet.name));
      }
    }
  }
}
