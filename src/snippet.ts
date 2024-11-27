import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mkdirp, writeFile } from '@tomjs/node';
import { languages, TabInputText, Uri, window } from 'vscode';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import { getSnippetLanguage } from './utils';

export const snippetsManagerDir = path.join(os.homedir(), '.tomjs/vscode-snippets-manager');
export const codeSnippetDir = path.join(snippetsManagerDir, 'snippets');

export function getTempCodeSnippetPath(group: Group, snippet: Snippet) {
  return path.join(codeSnippetDir, `${group.id}.${snippet.id}.snippet`);
}

export function isCodeSnippetDir(dir: string) {
  return path.dirname(dir).toLocaleLowerCase() === codeSnippetDir.toLocaleLowerCase();
}

export const fixFilePath = (fileName: string) => fileName.toLocaleLowerCase();

export async function openSnippetFile(group: Group, snippet: Snippet) {
  await mkdirp(codeSnippetDir);

  const language = getSnippetLanguage(
    group.type === GroupType.language ? group.name : snippet.scope,
  );

  let code = '';
  if (Array.isArray(snippet.body)) {
    code = snippet.body.join('\n');
  }

  const codeSnippetFile = getTempCodeSnippetPath(group, snippet);
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

export function closeSnippetFile() {
  for (const tabGroup of window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (tab.input instanceof TabInputText) {
        if (isCodeSnippetDir(tab.input.uri.fsPath)) {
          window.tabGroups.close(tab);
        }
      }
    }
  }
}

const SNIPPETS_EXPIRED_TIME = 1000 * 60 * 60 * 24 * 30;
export function clearExpiredCodeSnippetFiles() {
  fsp.readdir(codeSnippetDir, { withFileTypes: true }).then(files => {
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(codeSnippetDir, file.name);
        fsp.stat(filePath).then(stat => {
          if (stat.ctime.getTime() < Date.now() - SNIPPETS_EXPIRED_TIME) {
            fsp.rm(filePath);
          }
        });
      }
    }
  });

  const legacyCodePath = path.join(snippetsManagerDir, 'code.snippet');
  if (fs.existsSync(legacyCodePath)) {
    fsp.rm(legacyCodePath);
  }
}
