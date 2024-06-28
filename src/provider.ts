import { i18n } from '@tomjs/vscode';
import type { Event, ProviderResult, TreeDataProvider, TreeView } from 'vscode';
import { EventEmitter, MarkdownString, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { getGroupIconPath, getGroups, searchGroupSnippets } from './data';
import type { Group, Snippet } from './types';
import { GroupType } from './types';
import { getIconsPath } from './utils';

export class GroupTreeItem extends TreeItem {
  group: Group;

  constructor(group: Group, collapsibleState: TreeItemCollapsibleState) {
    super(group.name, collapsibleState);
    this.group = group;

    this.tooltip = group.name;
    this.iconPath = getGroupIconPath(group, collapsibleState === TreeItemCollapsibleState.Expanded);

    if (group.type === GroupType.language) {
      this.contextValue = 'group';
    } else {
      this.contextValue = 'scopeGroup';
      this.description = group.filePath;
    }
  }
}

export class SnippetTreeItem extends TreeItem {
  groupTreeItem: GroupTreeItem;
  group: Group;
  snippet: Snippet;

  constructor(groupTreeItem: GroupTreeItem, snippet: Snippet) {
    super(snippet.name, TreeItemCollapsibleState.None);
    this.group = groupTreeItem.group;
    this.groupTreeItem = groupTreeItem;
    this.snippet = snippet;

    this.contextValue = 'snippet';
    this.description = snippet.description;
    this.tooltip = new MarkdownString(snippet.prefix).appendText(`\n${snippet.description || ''}`);

    this.command = {
      command: 'tomjs.snippets.editSnippetBody',
      title: i18n.t('tomjs.snippets.editSnippetBody'),
      arguments: [this.group, snippet],
    };

    this.iconPath = getIconsPath('snippet.svg');
  }
}

function getTreeItemCollapsibleState(group: Group, expandedGroupIds: string[]) {
  if (!group.snippets?.length) {
    return TreeItemCollapsibleState.None;
  }
  return expandedGroupIds.includes(group.filePath)
    ? TreeItemCollapsibleState.Expanded
    : TreeItemCollapsibleState.Collapsed;
}

class SnippetsManagerTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<GroupTreeItem | undefined | null | void>();
  onDidChangeTreeData?: Event<void | TreeItem | TreeItem[] | null | undefined> =
    this._onDidChangeTreeData.event;

  treeView!: TreeView<TreeItem>;

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
          return group.snippets.map(snippet => new SnippetTreeItem(element, snippet));
        }
      }
    }
    return [];
  }

  /**
   * refresh the data provider
   */
  async refresh(item?: GroupTreeItem | string) {
    const filePath = typeof item === 'string' ? item : item?.group?.filePath;
    await searchGroupSnippets(filePath);
    this._onDidChangeTreeData.fire(typeof item === 'string' ? undefined : item);
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
      const id = treeItem.group.filePath;
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
      const id = treeItem.group.filePath;
      const i = ids.indexOf(id);
      if (i === -1) {
        ids.push(id);
      }
    }
  });

  provider.treeView = treeView;
};
