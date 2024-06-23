import fs from 'node:fs';
import path from 'node:path';
import { readFile } from '@tomjs/node';
import { getAllWorkspaceFolders } from '@tomjs/vscode';
import type { CommentObject } from 'comment-json';
import jsonc from 'comment-json';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import { getIconsPath, getUserSnippetsPath } from './utils';

export const SUFFIX_JSON = '.json';
export const SUFFIX_CODE_SNIPPETS = '.code-snippets';

let _groups: Group[] = [];

function getGroupName(name: string, suffix: string) {
  return name.substring(0, name.length - suffix.length);
}

function getFileNames(dirPath: string) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(s => !s.isDirectory())
    .map(s => s.name);
}

function getSnippetGroups(dirPath: string, names: string[], suffix: string, type: GroupType) {
  if (names.length == 0) {
    return Promise.resolve([]);
  }
  return Promise.all(
    names
      .filter(s => s.endsWith(suffix))
      .map(async fileName => {
        const name = getGroupName(fileName, suffix);
        const filePath = path.join(dirPath, fileName);
        const snippets = await readSnippetFile(filePath);

        return {
          name,
          fileName,
          filePath,
          type,
          ...snippets,
        } as Group;
      }),
  );
}

async function readSnippetFile(filePath: string) {
  const text = await readFile(filePath);
  const result = {
    json: {} as CommentObject,
    snippets: [] as Snippet[],
  };

  if (!text) {
    return result;
  }

  try {
    const json = jsonc.parse(text, undefined, false) as CommentObject;
    result.json = json;
    result.snippets = Object.keys(json).map(
      key => jsonc.assign({ name: key }, json[key]) as Snippet,
    );
  } catch (e) {
    console.error(e);
  }

  return result;
}

/**
 * Search all snippet files or specified snippet file
 * @param snippetFilePath snippet file path, if not specified, search all snippet files
 * @returns
 */
export async function searchGroupSnippets(snippetFilePath?: string) {
  if (snippetFilePath) {
    const group = _groups.find(g => g.filePath === snippetFilePath);
    if (!group) {
      // create a new group?
      return _groups;
    }
    const snippets = await readSnippetFile(snippetFilePath);
    Object.assign(group, snippets);
    return _groups;
  }

  // user snippets
  const userDir = getUserSnippetsPath();
  const list = getFileNames(userDir);

  const searchGroups = [getSnippetGroups(userDir, list, SUFFIX_CODE_SNIPPETS, GroupType.global)];

  getAllWorkspaceFolders().forEach(workspaceDir => {
    const dir = path.join(workspaceDir.uri.fsPath, '.vscode');
    if (fs.existsSync(dir)) {
      searchGroups.push(
        getSnippetGroups(dir, getFileNames(dir), SUFFIX_CODE_SNIPPETS, GroupType.workspace),
      );
    }
  });
  searchGroups.push(getSnippetGroups(userDir, list, SUFFIX_JSON, GroupType.language));

  const values = await Promise.all(searchGroups);
  _groups = values.flat();
  return _groups;
}

export function getGroups() {
  return _groups;
}

export function isLanguageGroup(group: Group) {
  return group.type === GroupType.language;
}

export function getGroupIconPath(group: Group | GroupType, expanded?: boolean) {
  const type = typeof group === 'object' && 'type' in group ? group.type : group;
  if (type === GroupType.language) {
    return getIconsPath(expanded ? 'language_opened.svg' : 'language.svg');
  }

  if (type === GroupType.global) {
    return getIconsPath(expanded ? 'global_opened.svg' : 'global.svg');
  }

  if (type === GroupType.workspace) {
    return getIconsPath(expanded ? 'workspace_opened.svg' : 'workspace.svg');
  }

  return getIconsPath('wrong.svg');
}