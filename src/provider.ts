import { i18n } from '@tomjs/vscode';
import type {
  CancellationToken,
  DataTransfer,
  Event,
  ProviderResult,
  TreeDataProvider,
  TreeDragAndDropController,
  TreeView,
} from 'vscode';
import {
  DataTransferItem,
  EventEmitter,
  MarkdownString,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from 'vscode';
import { getGroupIconPath, getGroups, searchGroupSnippets, writeSnippetFile } from './data';
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
    try {
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
    } catch (e: any) {
      console.error(e);
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

  refreshTree() {
    this._onDidChangeTreeData.fire();
  }
}

const MIMETYPE = 'application/vnd.code.tree.tomjssnippetsmanager';
class SnippetTreeDragAndDropController implements TreeDragAndDropController<TreeItem> {
  dropMimeTypes: readonly string[] = [MIMETYPE];
  dragMimeTypes: readonly string[] = [MIMETYPE];

  provider: SnippetsManagerTreeDataProvider;

  constructor(provider: SnippetsManagerTreeDataProvider) {
    this.provider = provider;
  }

  handleDrag(
    source: readonly TreeItem[],
    dataTransfer: DataTransfer,
    token: CancellationToken,
  ): Thenable<void> | void {
    if (source.length !== 1 || token.isCancellationRequested) return;

    const node = source[0];
    if (node instanceof GroupTreeItem) return;

    dataTransfer.set(MIMETYPE, new DataTransferItem(node));
  }

  async handleDrop(
    target: GroupTreeItem | SnippetTreeItem | undefined,
    dataTransfer: DataTransfer,
    token: CancellationToken,
  ) {
    if (!target || token.isCancellationRequested) return;

    const transferItem = dataTransfer.get(MIMETYPE);
    const source: SnippetTreeItem = transferItem?.value;
    if (!source) return;

    console.log('target:', target);
    console.log('source:', source);

    const sg = source.group;
    const tg = target.group;

    if (
      sg.filePath === tg.filePath &&
      source instanceof SnippetTreeItem &&
      target instanceof SnippetTreeItem &&
      source.snippet.name === target.snippet.name
    ) {
      return;
    }

    // two possibilities
    // 1. target is GroupTreeItem: move the snippet to the top of the target group
    // 2. target is SnippetTreeItem: move the snippet to the after of the target snippet

    // same group:
    const sameGroup = sg.filePath === tg.filePath;
    if (sameGroup && tg.snippets.length <= 1) {
      return;
    }

    // different group
    if (!sameGroup && sg.type != tg.type) {
      if (tg.type === GroupType.language) {
        delete source.snippet.scope;
      } else {
        let scope = sg.name;
        if (scope === 'javascript') {
          scope = 'javascript,typescript';
        }
        source.snippet.scope = scope;
      }
    }

    const sIndex = sg.snippets.findIndex(s => s.name === source.snippet.name);
    if (sIndex !== -1) {
      sg.snippets.splice(sIndex, 1);
    }

    if (target instanceof GroupTreeItem) {
      tg.snippets = [source.snippet, ...tg.snippets];
    } else {
      const tIndex = tg.snippets.findIndex(s => s.name === target.snippet.name);
      if (tIndex !== -1) {
        tg.snippets.splice(tIndex + 1, 0, source.snippet);
      }
    }

    if (!sameGroup) {
      await writeSnippetFile(sg.filePath, sg.snippets);
    }
    await writeSnippetFile(tg.filePath, tg.snippets);

    await provider.refresh();
  }
}

export const provider = new SnippetsManagerTreeDataProvider();

export const createSnippetsManagerTreeView = () => {
  const treeView = window.createTreeView('tomjsSnippetsManager', {
    treeDataProvider: provider,
    dragAndDropController: new SnippetTreeDragAndDropController(provider),
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
