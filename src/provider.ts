import { i18n } from '@tomjs/vscode';
import type { Event, ProviderResult, TreeDataProvider } from 'vscode';
import { EventEmitter, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { getGroups, searchGroupSnippets } from './data';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import { getIconsPath } from './utils';

export class GroupTreeItem extends TreeItem {
  group: Group;

  constructor(group: Group, collapsibleState: TreeItemCollapsibleState) {
    super(group.name, collapsibleState);
    this.group = group;

    this.tooltip = group.name;
    const expanded = TreeItemCollapsibleState.Expanded;

    if (group.type === GroupType.language) {
      this.contextValue = 'group';
      this.iconPath = getIconsPath(expanded ? 'language_opened.svg' : 'language.svg');
    } else {
      this.contextValue = 'scopeGroup';
      this.description = group.filePath;
      if (group.type === GroupType.global) {
        this.iconPath = getIconsPath(expanded ? 'global_opened.svg' : 'global.svg');
      } else if (group.type === GroupType.workspace) {
        this.iconPath = getIconsPath(expanded ? 'workspace_opened.svg' : 'workspace.svg');
      }
    }
  }
}

export class SnippetTreeItem extends TreeItem {
  group: Group;
  snippet: Snippet;

  constructor(group: Group, snippet: Snippet) {
    super(snippet.name, TreeItemCollapsibleState.None);
    this.group = group;
    this.snippet = snippet;

    this.contextValue = 'snippet';
    this.description = snippet.description;
    this.tooltip = this.description;

    this.command = {
      command: 'tomjs.snippets.editSnippet',
      title: i18n.t('tomjs.snippets.editSnippet'),
    };

    this.iconPath = getIconsPath('snippet.svg');
  }
}

function getTreeItemCollapsibleState(group: Group, expandedGroupIds: string[]) {
  if (!group.snippets?.length) {
    return TreeItemCollapsibleState.None;
  }
  return expandedGroupIds.includes(group.id)
    ? TreeItemCollapsibleState.Expanded
    : TreeItemCollapsibleState.Collapsed;
}

class SnippetsManagerTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<GroupTreeItem | undefined | null | void>();
  onDidChangeTreeData?: Event<void | TreeItem | TreeItem[] | null | undefined> =
    this._onDidChangeTreeData.event;

  expandedGroupIds: string[] = [];

  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }
  getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element) {
      return getGroups().map(
        group =>
          new GroupTreeItem(group, getTreeItemCollapsibleState(group, this.expandedGroupIds)),
      );
    } else if (element instanceof GroupTreeItem) {
      const { group } = element;
      if (group) {
        if (Array.isArray(group.snippets)) {
          return group.snippets.map(snippet => new SnippetTreeItem(group, snippet));
        }
      }
    }
    return [];
  }

  async refresh() {
    await searchGroupSnippets();
    this._onDidChangeTreeData.fire();
  }
}

export const provider = new SnippetsManagerTreeDataProvider();

export const createSnippetsManagerTreeView = () => {
  const treeView = window.createTreeView('tomjsSnippetsManager', {
    treeDataProvider: provider,
  });

  treeView.onDidCollapseElement(async e => {
    const treeItem = e.element;
    if (treeItem instanceof GroupTreeItem) {
      const ids = provider.expandedGroupIds;
      const id = treeItem.group.id;
      const i = ids.indexOf(id);
      if (i !== -1) {
        ids.splice(i, 1);
      }
    }
  });

  treeView.onDidExpandElement(async e => {
    const treeItem = e.element;
    if (treeItem instanceof GroupTreeItem) {
      const ids = provider.expandedGroupIds;
      const id = treeItem.group.id;
      const i = ids.indexOf(id);
      if (i === -1) {
        ids.push(id);
      }
    }
  });

  return treeView;
};
