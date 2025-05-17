<script lang="ts" setup>
import type { RuleExpression } from 'vee-validate';
import type { MaybeRef } from 'vue';
import { useField } from 'vee-validate';
import { ref, watch } from 'vue';

defineOptions({
  name: 'VsTextArea',
});

const props = defineProps<{
  label: string;
  autofocus?: boolean;
  cols?: number;
  disabled?: boolean;
  form?: string;
  maxlength?: number;
  name: string;
  placeholder?: string;
  readonly?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  rows?: number;
  value?: string;
  rules?: MaybeRef<RuleExpression<string>>;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
}>();

const { errorMessage, handleBlur, setValue, meta } = useField(() => props.name, props.rules, {
  initialValue: props.value,
  syncVModel: 'value',
});
const _value = ref(props.value);

watch(
  () => props.value,
  (value) => {
    _value.value = value;
    setValue(value || '');
  },
);

function onChange(e: InputEvent) {
  _value.value = (e.target as HTMLInputElement).value;
  setValue(_value.value);
  emit('update:value', _value.value);
}
</script>

<template>
  <div class="component-wrapper" :class="{ 'has-error': !!errorMessage, 'success': meta.valid }">
    <label :for="name">{{ label }}</label>
    <vscode-text-area v-bind="props" :value="_value" @input="onChange" @blur="handleBlur" />
    <p v-show="errorMessage || meta.valid" class="help-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
@import '../style';
</style>
