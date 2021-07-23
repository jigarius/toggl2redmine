/**
 * Wrapper around the browser's local storage.
 */
export class LocalStorage {
  constructor() {
    if (typeof window['localStorage'] === 'undefined') {
      throw new Error("Missing browser feature: localStorage");
    }
  }

  get(key: string, fallback: any = null) {
    let value = window.localStorage.getItem(key)
    if (value !== null) {
      return value
    }

    return fallback
  }

  set(key: string, value: any) {
    window.localStorage.setItem(key, value)
    return value;
  }
}
