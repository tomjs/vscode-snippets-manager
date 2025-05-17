<script lang="ts" setup>
import type { RuleExpression } from 'vee-validate';
import type { MaybeRef } from 'vue';
import { useField } from 'vee-validate';
import { ref, watch } from 'vue';

defineOptions({
  name: 'VsCheckbox',
});

const props = defineProps<{
  label: string;
  name: string;
  value?: string[];
  options?: (CheckboxOptions | string)[];
  rules?: MaybeRef<RuleExpression<string[]>>;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: string[]): void;
}>();

export interface CheckboxOptions {
  value: string;
  label: string;
}

const { errorMessage, setValue, meta } = useField(() => props.name, props.rules, {
  initialValue: props.value,
  syncVModel: 'value',
});

const _value = ref(props.value || []);

watch(
  () => props.value,
  (value) => {
    _value.value = value || [];
    setValue(_value.value);
  },
);

const _options = ref<CheckboxOptions[]>([]);

function formatOptions(values?: (CheckboxOptions | string)[]) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((s) => {
    if (typeof s === 'string') {
      return { label: s, value: s };
    }
    return s;
  });
}
_options.value = formatOptions(props.options);

watch(
  () => props.options,
  () => {
    _options.value = formatOptions(props.options);
  },
);

function onChange(e: InputEvent, value: string) {
  const checked = (e.target as HTMLInputElement).checked;
  if (checked) {
    if (!_value.value.includes(value)) {
      _value.value.push(value);
    }
  }
  else {
    _value.value = _value.value.filter(v => v !== value);
  }

  setValue(_value.value);
  emit('update:value', _value.value);
}
</script>

<template>
  <div class="component-wrapper" :class="{ 'has-error': !!errorMessage, 'success': meta.valid }">
    <label :for="name">{{ label }}</label>
    <template v-if="Array.isArray(_options)">
      <vscode-checkbox
        v-for="item in _options"
        :key="item.value"
        :checked="_value.includes(item.value)"
        @change="onChange($event, item.value)"
      >
        {{ item.label }}
      </vscode-checkbox>
    </template>
    <p v-show="errorMessage || meta.valid" class="help-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
@import '../style';
</style>
