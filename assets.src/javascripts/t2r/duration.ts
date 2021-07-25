/**
 * Round up.
 *
 * Example: 25 seconds and 35 seconds both become 1 minute.
 */
export const ROUND_UP = 'U'

/**
 * Round down.
 *
 * Example: 25 seconds and 35 seconds both become 0 minute.
 */
export const ROUND_DOWN = 'D'

/**
 * Round regular.
 *
 * Example: 25 seconds becomes 0 minute.
 * Example: 35 seconds becomes 1 minute.
 */
export const ROUND_REGULAR = 'R'

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
  setHHMM(hhmm: string) {
    let parts: any[] | null
    let pattern: RegExp
    let hh: number | null
    let mm: number | null
    let error = `Invalid hh:mm format: ${hhmm}`

    // Parse hh only. Ex: 2 = 2h 00m.
    pattern = /^(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      hh = parseInt(hhmm.match(pattern)!.pop()!)
      this.seconds = hh * 60 * 60
      return
    }

    // Parse hh:mm duration. Ex: 2:30 = 2h 30m.
    pattern = /^(\d{0,2}):(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      parts = hhmm.match(pattern)!.slice(-2);
      mm = parseInt(parts.pop() || '0')
      hh = parseInt(parts.pop() || '0')

      if (mm > 59) {
        throw error
      }

      this.seconds = hh * 60 * 60 + mm * 60
      return
    }

    // Parse hh.mm as decimal. Ex: 2.5 = 2h 30m.
    pattern = /^(\d{0,2})\.(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      parts = hhmm.match(pattern)!.slice(-2);

      mm = (60 * parts[1]) / Math.pow(10, parts[1].length);
      hh = Math.round(parts[0]);

      this.seconds = hh * 60 * 60 + mm * 60
      return
    }

    // No pattern matched? Throw error.
    throw error
  };

  /**
   * Gets the duration as hours and minutes.
   *
   * @return string
   *   Time in hh:mm format.
   */
  asHHMM() {
    let hh: string = this.hours.toString().padStart(2, '0')
    let mm: string = (this.minutes % 60).toString().padStart(2, '0')

    return `${hh}:${mm}`
  };

  /**
   * Gets the duration as hours in decimals.
   *
   * @return string
   *   Time in hours (decimal). Ex: 1.5 for 1 hr 30 min.
   */
  asDecimal(): string {
    // Only consider full minutes.
    let hours: number = this.minutes / 60
    // Convert to hours. Ex: 0h 25m becomes 0.416.
    let output: string = hours.toFixed(3)
    // Since toFixed rounds off the last digit, we ignore it.
    return output.substr(0, output.length - 1);
  };

  add(other: Duration) {
    this.seconds = this.seconds + other.seconds
  };

  sub(other: Duration) {
    // Duration cannot be negative.
    this.seconds = Math.max(this.seconds - other.seconds, 0)
  };

  /**
   * Rounds to the nearest minutes.
   *
   * @param {*} minutes
   *   Number of minutes to round to. Ex: 5, 10 or 15.
   * @param {string} direction
   *   One of T2R.ROUND_* constants.
   */
  roundTo(minutes: number, direction: string) {
    if (0 === minutes) {
      return;
    }
    let seconds: number = minutes * 60;

    // Do nothing if no correction / rounding is required.
    let correction: number = this.seconds % seconds;
    if (correction === 0) {
      return;
    }

    // Round according to rounding direction.
    switch (direction) {
      case ROUND_REGULAR:
        if (correction >= seconds / 2) {
          this.roundTo(minutes, ROUND_UP);
        }
        else {
          this.roundTo(minutes, ROUND_DOWN);
        }
        break;

      case ROUND_UP:
        this.add(new Duration(seconds - correction));
        break;

      case ROUND_DOWN:
        this.sub(new Duration(correction));
        break;

      default:
        throw 'Invalid rounding direction. Please use one of ROUND_*.';
    }
  };
}
