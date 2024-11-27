import { isNil, isString } from 'es-toolkit';
import { isEmpty } from 'es-toolkit/compat';
import { i18n } from '../core';

export function checkRequired(value: any) {
  return isNil(value) || isEmpty(isString(value) ? value.trim() : value) || value === false;
}

export function required() {
  return (value: any) => {
    if (checkRequired(value)) {
      return i18n.t('rules.required');
    }
    return true;
  };
}

export function checkMin(value: any, min: number) {
  return (isString(value) || Array.isArray(value)) && value.length < min;
}

export function min() {
  return (value: any, min: number) => {
    if (checkMin(value, min)) {
      return i18n.t('rules.min', { min });
    }
    return true;
  };
}

export function minArray() {
  return (value: any, min: number) => {
    if (checkMin(value, min)) {
      return i18n.t('rules.minArray', { min });
    }
    return true;
  };
}
