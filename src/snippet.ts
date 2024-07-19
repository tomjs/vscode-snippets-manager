import os from 'node:os';
import path from 'node:path';
import { mkdirp, writeFile } from '@tomjs/node';
import { languages, TabInputText, Uri, window } from 'vscode';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import { getSnippetLanguage, updateCodeSnippetState } from './utils';

export const codeSnippetDir = path.join(os.homedir(), '.tomjs/vscode-snippets-manager');
export const codeSnippetFile = path.join(codeSnippetDir, 'code.snippet');
export const fixFilePath = (fileName: string) => fileName.toLocaleLowerCase();
export const codeSnippetFileLower = fixFilePath(codeSnippetFile);

export async function openSnippetFile(group: Group, snippet: Snippet) {
  await mkdirp(codeSnippetDir);

  const language = getSnippetLanguage(
    group.type === GroupType.language ? group.name : snippet.scope,
  );

  await updateCodeSnippetState({
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

export function closeSnippetFile() {
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
