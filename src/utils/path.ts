import path from 'node:path';
import { getCtx, getUserDataPath } from '@tomjs/vscode';

export function getUserSnippetsPath() {
  return path.join(getUserDataPath(), 'snippets');
}

export function getExtensionPath() {
  return getCtx().extensionPath;
}

export function getResourcesPath(...paths: string[]) {
  return path.join(getExtensionPath(), 'resources', ...paths);
}

export function getIconsPath(...paths: string[]) {
  return path.join(getExtensionPath(), 'resources', 'icons', ...paths);
}
