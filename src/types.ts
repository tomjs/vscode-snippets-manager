import type { CommentJSONValue } from 'comment-json';

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
  json?: CommentJSONValue;
  type?: GroupType;
}

export interface Snippet {
  name: string;
  scope?: string;
  prefix: string;
  body: string;
  description?: string;
}

export interface CodeStore {
  name: string;
  filePath: string;
  language: string;
}

export interface UserConfig {
  fixedLanguages: string[];
}
