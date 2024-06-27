import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeTextArea,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';
import type { App } from 'vue';
import Checkbox from './Checkbox';
import Input from './Input';
import TextArea from './TextArea';

export { Checkbox, Input, TextArea };

export function registerComponents(_app: App) {
  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodeTextArea(),
    vsCodeTextField(),
  );
}
