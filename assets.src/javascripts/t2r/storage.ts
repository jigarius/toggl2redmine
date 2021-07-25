/**
 * Wrapper around the browser's local storage.
 */
export class LocalStorage {
  constructor() {
    if (typeof window['localStorage'] === 'undefined') {
      throw new Error("Missing browser feature: localStorage");
    }
  }

  get(key: string, fallback: any = null): any {
    const value = window.localStorage.getItem(key)
    if (value !== null) {
      return value
    }

    return fallback
  }

  set(key: string, value: any): any {
    if (value === null) {
      return this.delete(key)
    }

    window.localStorage.setItem(key, value)
    return value;
  }

  delete(key: string): any {
    const value = this.get(key)
    window.localStorage.removeItem(key)
    return value
  }
}

/**
 * A storage handler to store data in temporary memory.
 *
 * All data is lost when the page is reloaded
 */
export class TemporaryStorage {
  data: any
  constructor() {
    this.data = {}
  }

  get(key: string, fallback: any = null) {
    if (typeof this.data[key] !== 'undefined') {
      return this.data[key]
    }

    return fallback
  }

  set(key: string, value: any) {
    this.data[key] = value || null
    return this.data[key]
  }
}
