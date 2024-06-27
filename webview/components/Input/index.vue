<script lang="ts" setup>
import { type RuleExpression, useField } from 'vee-validate';
import { type MaybeRef, ref, watch } from 'vue';

defineOptions({
  name: 'VsInput',
});

const props = withDefaults(
  defineProps<{
    label: string;
    autofocus?: boolean;
    disabled?: boolean;
    maxlength?: number;
    name: string;
    placeholder?: string;
    readonly?: boolean;
    size?: number;
    type?: 'text' | 'email' | 'password' | 'tel' | 'url';
    value?: string;
    rules?: MaybeRef<RuleExpression<string>>;
  }>(),
  {
    size: 80,
  },
);

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
  value => {
    _value.value = value;
    setValue(value || '');
  },
);

const onChange = (e: InputEvent) => {
  _value.value = (e.target as HTMLInputElement).value;
  setValue(_value.value);
  emit('update:value', _value.value);
};
</script>

<template>
  <div class="component-wrapper" :class="{ 'has-error': !!errorMessage, success: meta.valid }">
    <label :for="name">{{ label }}</label>
    <vscode-text-field v-bind="props" :value="_value" @input="onChange" @blur="handleBlur" />
    <p v-show="errorMessage || meta.valid" class="help-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
@import '../style.scss';
</style>
