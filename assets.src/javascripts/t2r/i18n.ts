interface StringMap { [index:string]: string }

// UI translations.
declare const T2R_TRANSLATIONS: StringMap

/**
 * Equivalent of I18n.t().
 *
 * @param {string} key
 *   String ID.
 * @param {{}} vars
 *   Key-value pair of variables to replace.
 *
 * @example
 *   T2R.t('hello', { name: 'Junior' });
 *
 *   This replaces '@name' with 'Junior'.
 *
 * @returns {string}
 *   Translated string if available.
 */
export function translate(key: string, vars: StringMap = {}): string {
  if (typeof T2R_TRANSLATIONS[key] === 'undefined') {
    const lang = $('html').attr('lang') || '??'
    return `translation missing: ${lang}.${key}`
  }

  let result: string = T2R_TRANSLATIONS[key];
  for (const name in vars) {
    result = result.replace('@' + name, vars[name])
  }

  return result;
}
