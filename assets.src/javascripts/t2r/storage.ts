/**
 * Wrapper around the browser's local storage.
 */
export class LocalStorage {
  private _prefix: string

  constructor(prefix: string) {
    this._prefix = prefix

    if (typeof window['localStorage'] === 'undefined') {
      throw new Error("Missing browser feature: localStorage");
    }
  }

  get prefix(): string {
    return this._prefix
  }

  get(key: string, fallback: any = null): any {
    const value = window.localStorage.getItem(this.prefix + key)
    if (value !== null) {
      return value
    }

    return fallback
  }

  set(key: string, value: any): any {
    if (value === null) {
      return this.delete(this.prefix + key)
    }

    window.localStorage.setItem(this.prefix + key, value)
    return value;
  }

  delete(key: string): any {
    const value = this.get(this.prefix + key)
    window.localStorage.removeItem(this.prefix + key)
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
