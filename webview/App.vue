<script setup lang="ts">
import { vscodeWebview } from '@tomjs/vscode-webview';
import cloneDeep from 'lodash/cloneDeep';
import { useForm } from 'vee-validate';
import { ref } from 'vue';
import { Checkbox, Input, TextArea } from './components';
import { i18n } from './core';
import { checkMin, checkRequired, required } from './utils/rules';

interface FormState {
  name: string;
  prefix: string;
  scope?: string[];
  body: string;
  description: string;
  fileName?: string;
  filePath?: string;
}

interface CodeLanguage {
  lang: string;
  current?: boolean;
  user?: boolean;
  used?: boolean;
}

const formData = ref<FormState>({
  name: '',
  prefix: '',
  body: '',
  description: '',
});

const languages = ref<string[]>([]);
const names = ref<string[]>([]);

let formStateCache: FormState = {
  name: '',
  prefix: '',
  body: '',
  description: '',
};

function getScope(scope?: string | string[]) {
  if (scope) {
    if (typeof scope === 'string') {
      // @ts-ignore
      return scope.split(',').map(s => s.trim());
    } else if (Array.isArray(scope)) {
      return scope.map(s => s.trim());
    }
  }
}

console.log(navigator.language, navigator.languages);

const { handleSubmit } = useForm({
  validationSchema: {
    name: (value: any) => {
      if (checkRequired(value)) {
        return i18n.t('rules.required');
      }
      if (formStateCache.name) {
        if (formStateCache.name !== value && names.value.includes(value)) {
          return i18n.t('rules.exist', [value]);
        }
      } else if (names.value.includes(value)) {
        return i18n.t('rules.exist', [value]);
      }
      return true;
    },
    prefix: required(),
    scope: (value: any) => {
      if (!Array.isArray(languages.value) || languages.value.length === 0) {
        return true;
      }
      if (checkMin(value, 1)) {
        return i18n.t('rules.minArray', { min: 1 });
      }
      return true;
    },
  },
});

vscodeWebview.on<{ snippet: FormState; languages: CodeLanguage[]; names: string[] }>(
  'snippet',
  data => {
    const res = data || {};

    const { scope, body, ...rest } = res.snippet || {};

    formStateCache = {
      ...rest,
      scope: getScope(scope),
      body: Array.isArray(body) ? body.join('\n') : body,
    };

    formData.value = cloneDeep(formStateCache);

    languages.value = (res?.languages || []).map(s => s.lang);

    names.value = res.names || [];
  },
);

const onSubmit = handleSubmit.withControlled(values => {
  console.log('values:', values);
  vscodeWebview.postMessage('save', {
    ...formStateCache,
    ...values,
    scope: Array.isArray(values.scope) ? values.scope.join(',') : undefined,
    origin: formStateCache.name,
  });
});

const onRest = () => {
  formData.value = cloneDeep(formStateCache);
};
</script>

<template>
  <form @submit="onSubmit">
    <div class="form-item">
      <Input v-model:value="formData.name" name="name" label="name" />
    </div>
    <div class="form-item">
      <Input v-model:value="formData.prefix" name="prefix" label="prefix" />
    </div>
    <div v-if="languages && languages.length" class="form-item" style="max-width: 550px">
      <Checkbox v-model:value="formData.scope" name="scope" label="scope" :options="languages" />
    </div>
    <div class="form-item">
      <Input v-model:value="formData.description" name="description" label="description" />
    </div>
    <div class="form-item">
      <TextArea
        v-model:value="formData.body"
        name="body"
        label="body"
        resize="both"
        :cols="82"
        :rows="10"
      />
    </div>
    <div class="form-item">
      <vscode-button type="submit">{{ $t('submit') }}</vscode-button>
      <vscode-button style="margin-left: 8px" @click="onRest">{{ $t('reset') }}</vscode-button>
    </div>
  </form>
</template>

<style>
form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  height: 100%;
}
</style>
