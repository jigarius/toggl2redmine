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
    if (value === null) {
      return this.delete(key)
    }

    window.localStorage.setItem(key, value)
    return value;
  }

  delete(key: string) {
    let value = this.get(key)
    window.localStorage.removeItem(key)
    return value
  }
}
