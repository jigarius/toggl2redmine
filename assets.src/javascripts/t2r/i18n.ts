// UI translations.
declare const T2R_TRANSLATIONS: any

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
export function translate(key: string, vars: any = {}): string {
  if (typeof T2R_TRANSLATIONS[key] === 'undefined') {
    const lang = $('html').attr('lang') || '??'
    return `translation missing: ${lang}.${key}`
  }

  let result: string = T2R_TRANSLATIONS[key];
  for (let v in vars) {
    result = result.replace('@' + v, vars[v])
  }

  return result;
}
