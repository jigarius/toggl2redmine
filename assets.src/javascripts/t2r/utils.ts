/**
 * A no-op callback which simply logs all arguments.
 */
export function noopCallback(data: any) {
  console.warn('No callback was provided to handle this data ', data);
}

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
 * Converts a date string into a Date object.
 *
 * @param {string} date
 *   The string to parse as a date.
 *
 * @returns {Date}
 *   The date as an object.
 */
export function dateStringToObject(date: string): Date | undefined {
  // Split the date into parts.
  // Don't use Date.parse() as it works differently depending on the browser.
  const dateParts: any[] = date.split(/[^\d]/);

  // Must have at least the "date" part.
  if (dateParts.length < 3) {
    console.error('Invalid date', date)
    return
  }

  // Assume time parts to be 00 if not defined.
  for (let i = 3; i <= 6; i++) {
    if (typeof dateParts[i] === 'undefined') {
      dateParts[i] = '0';
    }
  }

  // Adjust month count to begin with 0.
  dateParts[1] = parseInt(dateParts[1]) - 1;

  // Create date with yyyy-mm-dd hh:mm:ss ms.
  try {
    return new Date(
      dateParts[0],
      dateParts[1],
      dateParts[2],
      dateParts[3],
      dateParts[4],
      dateParts[5],
      dateParts[6]
    );
  } catch(e) {
    console.error('Invalid date', date)
    return
  }
}

/**
 * Gets date from window.location.hash.
 */
export function getDateFromLocationHash(): string | undefined {
  const matches = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
  if (!matches) return

  const match: string = matches.pop()!;
  if (!dateStringToObject(match)) return

  console.debug('Got date from URL fragment', match);
  return match;
}
