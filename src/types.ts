export enum GroupType {
  language = 'language',
  global = 'global',
  workspace = 'workspace',
}

export interface Group {
  name: string;
  filePath: string;
  fileName: string;
  snippets: Snippet[];
  type: GroupType;
}

export interface Snippet {
  name: string;
  scope?: string;
  prefix: string;
  body: string[];
  description?: string;
}

export interface LanguageItem {
  lang: string;
  current?: boolean;
  user?: boolean;
  used?: boolean;
}

export interface CodeSnippetState {
  /**
   * snippet name
   */
  name: string;
  /**
   * group file path
   */
  filePath: string;
  /**
   * snippet language
   */
  language?: string;
}

export interface PostDataSnippet extends Snippet {
  filePath: string;
  origin?: string;
}

export interface PostData {
  snippet: PostDataSnippet;
  languages: LanguageItem[];
  names: string[];
}

export interface UserConfig {
  fixedLanguages: string[];
  scopeLanguages: string[];
}
