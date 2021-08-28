/**
 * A wrapper for JavaScript's Date object.
 */
export class DateTime {

  readonly date: Date;

  constructor(date: Date | undefined = undefined) {
    this.date = date || new Date()
  }

  /**
   * Format date as YYYY-MM-DD.
   *
   * @param {Date} date
   *   A date.
   *
   * @returns {String}
   *   HTML-friendly date, e.g. 2021-02-28.
   */
  toHTMLDate(): string {
    const yyyy = this.date.getFullYear();
    const mm = (this.date.getMonth() + 1).toString().padStart(2, '0')
    const dd = this.date.getDate().toString().padStart(2, '0')

    return `${yyyy}-${mm}-${dd}`
  }

  /**
   * Format date in ISO format.
   *
   * Example: 2021-08-28T10:32:43.144Z
   *
   * @param zeroTime
   *   Whether time should be set to 00:00:00.
   */
  toISOString(zeroTime = false): string {
    if (!zeroTime) {
      return this.date.toISOString()
    }

    return this.date.toISOString().split('T')[0] + 'T00:00:00.000Z'
  }

  /**
   * Creates an instance from a date string.
   *
   * @param {string} date
   *   The string to parse as a date.
   *
   * @returns {DateTime|undefined}
   *   The date as an object.
   */
  static fromString(date: string): DateTime {
    // Don't use Date.parse() as it works differently depending on the browser.
    const dateParts: number[] = date.split(/[^\d]/).map((part) => {
      return parseInt(part)
    });

    // Must have at least the "date" part.
    if (dateParts.length < 3) {
      console.error('Invalid date', date)
      throw `Invalid date: ${date}`
    }

    // Assume time parts to be 00 if not defined.
    for (let i = 3; i <= 6; i++) {
      if (typeof dateParts[i] === 'undefined') {
        dateParts[i] = 0;
      }
    }

    // No part of the date can be non-numeric.
    for (let i = 1; i <= 6; i++) {
      if (isNaN(dateParts[i])) throw `Invalid date: ${date}`
    }

    if (dateParts[1] < 1 || dateParts[1] > 12) {
      throw `Invalid date: ${date}`
    }

    try {
      return new DateTime(new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        dateParts[3],
        dateParts[4],
        dateParts[5],
        dateParts[6]
      ));
    } catch(e) {
      console.error('Invalid date', date)
      throw `Invalid date: ${date}`
    }
  }

}

export enum RoundingMethod {
  Up = 'U',
  Down = 'D',
  Regular = 'R'
}

/**
 * Toggl to Redmine time duration.
 *
 * @param {string}
 *   A duration as hh:mm or seconds.
 */
export class Duration {

  // Number of seconds in the duration.
  private _seconds: number;

  /**
   * Creates a Duration object.
   *
   * @param duration [Optional] A duration.
   *
   * @example d = Duration(90)
   * @example d = Duration('90')
   * @example d = Duration('1:30')
   */
  constructor(duration: number | string = 0) {
    this._seconds = 0
    duration = duration || 0;

    if ('number' === typeof duration) {
      this.seconds = duration;
      return
    }

    if (duration.match(/^\d+$/)) {
      this.seconds = parseInt(duration)
      return
    }

    try {
      this.setHHMM(duration);
    } catch (e) {
      throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
    }
  }

  get hours(): number {
    return Math.floor(this._seconds / 3600)
  }

  get minutes(): number {
    return Math.floor(this._seconds / 60)
  }

  get seconds(): number {
    return this._seconds
  }

  set seconds(value: number) {
    if (value < 0) {
      throw `Value cannot be negative: ${value}`
    }

    this._seconds = value
  }

  /**
   * Sets duration from hours and minutes.
   *
   * Supported formats:
   *   - 2 = 2h 00m
   *   - 2:30 = 2h 30m
   *   - :5 = 0h 5m
   *   - :30 = 0h 30m
   *   - 2.50 = 2h 30m
   *   - .5 = 0h 30m
   *
   * @param {string} hhmm
   */
  setHHMM(hhmm: string): void {
    let parts: string[] = []
    let pattern: RegExp
    let hh: number | null
    let mm: number | null
    const error = `Invalid hh:mm format: ${hhmm}`

    // Parse hh only. Ex: 2 = 2h 00m.
    pattern = /^(\d{0,2})$/
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern) as RegExpMatchArray
      hh = parseInt(matches.pop() as string)
      this.seconds = hh * 60 * 60
      return
    }

    // Parse hh:mm duration. Ex: 2:30 = 2h 30m.
    pattern = /^(\d{0,2}):(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern) as RegExpMatchArray
      parts = matches.slice(-2)
      mm = parseInt(parts.pop() || '0')
      hh = parseInt(parts.pop() || '0')

      if (mm > 59) throw error

      this.seconds = hh * 60 * 60 + mm * 60
      return
    }

    // Parse hh.mm as decimal. Ex: 2.5 = 2h 30m.
    pattern = /^(\d{0,2})\.(\d{1,2})$/
    if (hhmm.match(pattern)) {
      const matches = hhmm.match(pattern) as RegExpMatchArray
      parts = matches.slice(-2)
      hh = parseInt(parts[0] || '0')
      hh = Math.round(hh)
      mm = parseInt(parts[1] || '0')
      mm = (60 * mm) / Math.pow(10, parts[1].length)

      this.seconds = hh * 60 * 60 + mm * 60
      return
    }

    throw error
  }

  /**
   * Gets the duration as hours and minutes.
   *
   * @return string
   *   Time in hh:mm format.
   */
  asHHMM(): string {
    const hh: string = this.hours.toString().padStart(2, '0')
    const mm: string = (this.minutes % 60).toString().padStart(2, '0')

    return `${hh}:${mm}`
  }

  /**
   * Gets the duration as hours in decimals.
   *
   * @return string
   *   Time in hours (decimal). Ex: 1.5 for 1 hr 30 min.
   */
  asDecimal(): string {
    // Only consider full minutes.
    const hours: number = this.minutes / 60
    // Convert to hours. Ex: 0h 25m becomes 0.416.
    const output: string = hours.toFixed(3)
    // Since toFixed rounds off the last digit, we ignore it.
    return output.substr(0, output.length - 1);
  }

  add(other: Duration): void {
    this.seconds = this.seconds + other.seconds
  }

  sub(other: Duration): void {
    // Duration cannot be negative.
    this.seconds = Math.max(this.seconds - other.seconds, 0)
  }

  /**
   * Rounds to the nearest minutes.
   *
   * @param {*} minutes
   *   Number of minutes to round to. Ex: 5, 10 or 15.
   * @param {RoundingMethod} method
   *   Rounding logic.
   */
  roundTo(minutes: number, method: RoundingMethod): void {
    if (0 === minutes) return
    const seconds: number = minutes * 60;

    // Do nothing if no correction / rounding is required.
    const correction: number = this.seconds % seconds;
    if (correction === 0) return

    // Round according to rounding method.
    switch (method) {
      case RoundingMethod.Regular:
        if (correction >= seconds / 2) {
          this.roundTo(minutes, RoundingMethod.Up);
        }
        else {
          this.roundTo(minutes, RoundingMethod.Down);
        }
        break;

      case RoundingMethod.Up:
        this.add(new Duration(seconds - correction));
        break;

      case RoundingMethod.Down:
        this.sub(new Duration(correction));
        break;

      default:
        throw 'Invalid rounding method.';
    }
  }
}
