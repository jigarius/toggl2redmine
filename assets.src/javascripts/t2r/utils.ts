import * as datetime from "./datetime.js"

/**
 * Replaces certain characters with HTML entities.
 */
export function htmlEntityEncode(str: string): string {
  return $('<div />')
    .text(str)
    .text()
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Gets date from window.location.hash.
 */
export function getDateFromLocationHash(): string | undefined {
  const matches = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
  if (!matches) return

  const match: string = matches.pop() as string
  try {
    return datetime.DateTime.fromString(match).toHTMLDate()
  } catch(e) {
    console.debug('Date not detected in URL fragment')
  }
}

/**
 * Event Callback.
 *
 * Callbacks for custom events.
 */
export interface EventListener { (): void }

/**
 * Event Manager.
 *
 * Handles registry and dispatch of events.
 */
export class EventManager {
  readonly listeners: { [index: string]: EventListener[] }

  constructor() {
    this.listeners = {}
  }

  public on(eventName: string, callback: EventListener): void {
    if (typeof this.listeners[eventName] === 'undefined') {
      this.listeners[eventName] = []
    }

    this.listeners[eventName].push(callback)
  }

  public trigger<Type>(eventName: string): void {
    if (typeof this.listeners[eventName] === 'undefined') return

    for (const listener of this.listeners[eventName]) {
      const result = listener()
    }
  }
}
