/* eslint @typescript-eslint/no-explicit-any: 0 */

/**
 * Wrapper around the browser's local storage.
 */
export class LocalStorage {
  private readonly _prefix: string

  constructor(prefix: string) {
    this._prefix = prefix

    if (typeof window['localStorage'] === 'undefined') {
      throw new Error("Missing browser feature: localStorage");
    }
  }

  get prefix(): string {
    return this._prefix
  }

  get<Type>(key: string, fallback: Type | null = null): string | Type | null {
    const value = window.localStorage.getItem(this.prefix + key)
    if (value !== null) {
      return value
    }

    return fallback
  }

  set<Type>(key: string, value: Type): Type {
    if (value === null) {
      return this.delete(this.prefix + key)
    }

    try {
      window.localStorage.setItem(this.prefix + key, (value as any).toString())
      return value;
    } catch(e) {
      console.error('Value not representable as string', value)
      throw 'Value could not be stored'
    }
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

  get(key: string, fallback: any = null): any {
    if (typeof this.data[key] !== 'undefined') {
      return this.data[key]
    }

    return fallback
  }

  set<Type>(key: string, value: Type): Type {
    this.data[key] = value || null
    return this.data[key]
  }
}
