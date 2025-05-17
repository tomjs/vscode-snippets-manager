<script setup lang="ts">
import { cloneDeep } from 'es-toolkit';
import { useForm } from 'vee-validate';
import { ref } from 'vue';
import { Checkbox, Input, TextArea } from './components';
import { i18n } from './core';
import { checkMin, checkRequired, required } from './utils/rules';
import { webviewApi } from './utils/vscode';

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
      return scope.split(',').map(s => s.trim());
    }
    else if (Array.isArray(scope)) {
      return scope.map(s => s.trim());
    }
  }
}

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
      }
      else if (names.value.includes(value)) {
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

webviewApi.on<{ snippet: FormState; languages: CodeLanguage[]; names: string[] }>(
  'snippet',
  (data) => {
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

webviewApi.post('get', undefined);

const onSubmit = handleSubmit.withControlled((values) => {
  webviewApi.post('save', {
    ...formStateCache,
    ...values,
    scope: Array.isArray(values.scope) ? values.scope.join(',') : undefined,
    origin: formStateCache.name,
  });
});

function onRest() {
  formData.value = cloneDeep(formStateCache);
}
</script>

<template>
  <form @submit="onSubmit">
    <div class="form-item" style="margin-bottom: 16px">
      <vscode-button type="submit">
        {{ $t('save') }}
      </vscode-button>
      <vscode-button style="margin-left: 8px" @click="onRest">
        {{ $t('reset') }}
      </vscode-button>
    </div>
    <div class="form-item form-item-flex">
      <div style="width: 250px">
        <Input v-model:value="formData.name" name="name" label="name" />
      </div>
      <div style="width: 250px">
        <Input v-model:value="formData.prefix" name="prefix" label="prefix" />
      </div>
    </div>

    <div v-if="languages && languages.length" class="form-item">
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

.form-item {
  width: 550px;
}

.form-item-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
