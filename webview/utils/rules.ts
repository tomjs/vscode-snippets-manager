import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import isString from 'lodash/isString';
import { i18n } from '../core';

// export function isEmpty(value: any): boolean {
//   if (value === null || value === undefined || value === '') {
//     return true;
//   }

//   if (Array.isArray(value) && value.length === 0) {
//     return true;
//   }

//   return false;
// }

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
