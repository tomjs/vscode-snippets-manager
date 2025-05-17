# Code Snippets Manager

VS Code 代码片段管理 / Snippets Manager for VS Code.

## 说明 (Note)

支持全局和当前工作空间中的代码片段的管理。

Supports the management of code snippets in the global and current workspace.

本项目受 [Easy Snippet](https://marketplace.visualstudio.com/items?itemName=inu1255.easy-snippet) 这个扩展的启发，并参考了他的代码和思路，非常感谢。项目中使用的部分图标资源，来自 [vscode-icons](https://github.com/vscode-icons/vscode-icons)，仅做了颜色修改。本项目由兴趣和个人需求而开发，不一定满足所有人的需求。

This project is inspired by the extension [Easy Snippet](https://marketplace.visualstudio.com/items?itemName=inu1255.easy-snippet) and refers to his code and ideas. Thanks very much. Some icon resources used in the project are from [vscode-icons](https://github.com/vscode-icons/vscode-icons), and only the color is modified. This project is developed out of interest and personal needs, and may not meet the needs of everyone.

## 功能 Features

- 支持多类型片段 Support multiple types of Snippets
  - 语言 Language
  - 全局 Global
  - 工作空间 Workspace
- 支持片段的拖拽排序 Support drag and sort of snippets
- 国际化 Internationalization
  - 简体中文
  - English

### 属性 Properties

- `tomjs.snippets.fixedLanguages`：代码片段优先可选语言。Optional languages for snippets to be displayed first
- `tomjs.snippets.scopeLanguages`：代码片段 scope 属性的可选语言，未配置时为所有被支持的语言。Optional languages for the scope attribute of the snippets. If not configured, it will be all supported languages.

比如前端开发者，可以如下设置 For example, front-end developers can set it as follows

```json
{
  "tomjs.snippets.scopeLanguages": [
    "typescript",
    "javascript",
    "typescriptreact",
    "javascriptreact",
    "vue",
    "html",
    "less",
    "scss"
  ]
}
```

## 截图 Screenshots

部分截图，具体请操作。Some screenshots, please operate for details.

- 新增分组 Add Group

![group](https://raw.githubusercontent.com/tomjs/vscode-snippets-manager/main/resources/screenshots/group.png)

- 新增片段 Add Snippet

![snippet1](https://raw.githubusercontent.com/tomjs/vscode-snippets-manager/main/resources/screenshots/snippet1.png)

- 编辑片段 Edit Snippet

![snippet2](https://raw.githubusercontent.com/tomjs/vscode-snippets-manager/main/resources/screenshots/snippet2.png)

- 编辑代码 Edit Snippet Code

![snippet3](https://raw.githubusercontent.com/tomjs/vscode-snippets-manager/main/resources/screenshots/snippet3.png)

## Related

- [Easy Snippet](https://marketplace.visualstudio.com/items?itemName=inu1255.easy-snippet): Another easy way to manage snippet.
- [vscode-icons](https://github.com/vscode-icons/vscode-icons): Bring real icons to your Visual Studio Code.
