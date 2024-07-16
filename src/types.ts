import type { CommentObject } from 'comment-json';

export enum GroupType {
  language = 'language',
  global = 'global',
  workspace = 'workspace',
}

export interface Group {
  name: string;
  filePath: string;
  fileName: string;
  snippets?: Snippet[];
  json: CommentObject;
  type?: GroupType;
}

export interface Snippet {
  name: string;
  scope?: string;
  prefix: string;
  body: string[];
  description?: string;
}

export interface languageItem {
  lang: string;
  current?: boolean;
  user?: boolean;
  used?: boolean;
}

export interface CodeState {
  name: string;
  filePath: string;
  language: string;
}

export interface PostDataSnippet extends Snippet {
  filePath: string;
  origin?: string;
}

export interface PostData {
  snippet: PostDataSnippet;
  languages: languageItem[];
  names: string[];
}

export interface UserConfig {
  fixedLanguages: string[];
}
