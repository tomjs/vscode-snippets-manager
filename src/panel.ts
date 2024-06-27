import { getCtx, i18n } from '@tomjs/vscode';
import fs from 'fs';
import type { Disposable, Webview, WebviewPanel } from 'vscode';
import { ViewColumn, window } from 'vscode';
import { addOrUpdateSnippet, openEditSnippetPanel, openEditSnippetPanel } from './commands';
import { getGroups } from './data';
import { provider } from './provider';
import type { PostDataSnippet } from './types';
import { showError, showInfo } from './utils';

class SnippetPanel {
  panel: WebviewPanel;
  webview: Webview;
  private disposables: Disposable[] = [];

  disposed: boolean = false;

  constructor() {
    const panel = window.createWebviewPanel('snippetInfoPanel', 'Snippet', ViewColumn.One, {
      enableScripts: true,
    });

    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.webview = panel.webview;
    this.webview.html = this.getHtml();

    this.setupWebviewHooks();
  }

  getHtml() {
    return process.env.VITE_DEV_SERVER_URL
      ? __getWebviewHtml__(process.env.VITE_DEV_SERVER_URL)
      : __getWebviewHtml__(this.webview, getCtx());
  }

  public render() {
    this.panel.reveal(ViewColumn.One);
  }

  public postMessage<T>(type: string, data: T) {
    return this.webview.postMessage({ type, data });
  }

  public dispose() {
    this.panel.dispose();

    this.disposed = true;

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) disposable.dispose();
    }
  }

  private async addOrUpdateSnippet(data: PostDataSnippet) {
    const { filePath } = data || {};
    if (!data || !filePath || !fs.existsSync(filePath)) {
      showError(i18n.t('text.addSnippet.filePath', filePath || ''));
      return;
    }

    const group = getGroups().find(s => s.filePath == filePath);
    if (!group) {
      showError(i18n.t('text.addSnippet.notFound'));
      return;
    }

    const { origin, name, prefix, scope, body, description } = data || {};

    const snippets = group?.json;
    if (snippets && origin && origin !== name) {
      delete snippets[origin];
    }

    await addOrUpdateSnippet(group, { name, prefix, scope, body, description });
    await provider.refresh(filePath);
    showInfo(origin ? i18n.t('text.save.success', name) : i18n.t('text.add.success', name));

    if (!origin || (origin && origin !== name)) {
      const snippet = group.snippets?.find(s => s.name === name);
      if (!snippet) {
        return;
      }
      openEditSnippetPanel(group, snippet!);
    }
  }

  private setupWebviewHooks() {
    this.webview.onDidReceiveMessage(
      async (message: any) => {
        const type = message.type;
        const data = message.data;
        console.log(`type:`, type, data);
        if (type === 'save') {
          this.addOrUpdateSnippet(data);
        }
      },
      undefined,
      this.disposables,
    );
  }
}

let snippetPanel: SnippetPanel;
export function openSnippetPanel(title: string) {
  if (!snippetPanel || snippetPanel.disposed) {
    snippetPanel = new SnippetPanel();
  } else {
    snippetPanel.render();
  }
  snippetPanel.panel.title = title || 'Snippet';

  return snippetPanel;
}

export function closeSnippetPanel() {
  if (!snippetPanel || snippetPanel.disposed) {
    return;
  }
  snippetPanel.dispose();
}