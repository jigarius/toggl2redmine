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
