import type { Event, ProviderResult, TreeDataProvider } from 'vscode';
import { EventEmitter, TreeItem, window } from 'vscode';

export class SnippetGroupTreeItem extends TreeItem {}

export class SnippetChildTreeItem extends TreeItem {}

class SnippetTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<SnippetGroupTreeItem | undefined | null | void>();
  onDidChangeTreeData?: Event<void | TreeItem | TreeItem[] | null | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }
  getChildren(_element?: TreeItem): ProviderResult<TreeItem[]> {
    return [];
  }

  async refresh() {
    this._onDidChangeTreeData.fire();
  }
}

export const snippetProvider = new SnippetTreeDataProvider();

export const createSnippetTreeView = () => {
  const treeView = window.createTreeView('tomjsSnippetsManager', {
    treeDataProvider: snippetProvider,
  });
  return treeView;
};
