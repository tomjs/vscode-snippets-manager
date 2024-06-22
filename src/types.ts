import type { CommentJSONValue } from 'comment-json';

export enum GroupType {
  language = 'language',
  global = 'global',
  workspace = 'workspace',
}

export interface Group {
  id: string;
  name: string;
  filePath: string;
  fileName: string;
  snippets?: Snippet[];
  text?: string;
  json?: CommentJSONValue;
  type?: GroupType;
}

export interface Snippet {
  id: string;
  name: string;
  scope?: string;
  prefix: string;
  body: string;
  description: string;
}
