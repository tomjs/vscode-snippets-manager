<script setup lang="ts">
import { vscodeWebview } from '@tomjs/vscode-webview';
import cloneDeep from 'lodash/cloneDeep';
import { useForm } from 'vee-validate';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import * as yup from 'yup';
import { Checkbox, Input, TextArea } from './components';

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

const { handleSubmit } = useForm({});

const i18n = useI18n();

const rulesSchema = {
  name: yup.string().required(i18n.t('rule.required')),
  prefix: yup.string().required(i18n.t('rule.required')),
  scope: yup.array().min(1, ({ min }) => i18n.t('rule.min_select', [min])),
};

vscodeWebview.on<{ snippet: FormState; languages: CodeLanguage[] }>('snippet', data => {
  console.log('>>>', data);
  const res = data || {};

  const { scope, body, ...rest } = res.snippet || {};

  formStateCache = {
    ...rest,
    scope: getScope(scope),
    body: Array.isArray(body) ? body.join('\n') : body,
  };

  formData.value = cloneDeep(formStateCache);

  languages.value = (res?.languages || []).map(s => s.lang);
});

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
      <Input v-model:value="formData.name" name="name" label="name" :rules="rulesSchema.name" />
    </div>
    <div class="form-item">
      <Input
        v-model:value="formData.prefix"
        name="prefix"
        label="prefix"
        :rules="rulesSchema.prefix"
      />
    </div>
    <div v-if="languages && languages.length" class="form-item" style="max-width: 550px">
      <Checkbox
        v-model:value="formData.scope"
        name="scope"
        label="scope"
        :options="languages"
        :rules="rulesSchema.scope"
      />
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
