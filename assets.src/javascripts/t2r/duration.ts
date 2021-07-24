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

  // Number of hours in the duration.
  private _hours: number;

  // Number of minutes in the duration.
  private _minutes: number;

  // Number of seconds in the duration.
  private _seconds: number;

  constructor(duration: null | number | string = null) {
    duration = duration || 0;

    // Seconds as an integer.
    if ('number' === typeof duration) {
      this.setSeconds(duration);
      return
    }

    // Seconds as a string.
    if ('string' === typeof duration && duration.match(/^\d+$/)) {
      this.setSeconds(duration);
      return
    }

    try {
      this.setHHMM(duration);
    } catch (e) {
      throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
    }
  }

  /**
   * Sets duration from seconds.
   *
   * @param {integer} seconds
   */
  setSeconds(seconds) {
    // Set duration form seconds.
    seconds += '';
    if (!seconds.match(/^\d+$/)) {
      throw 'Error: ' + seconds + ' is not a valid number.';
    }

    // Set seconds.
    this._seconds = parseInt(seconds);

    // Ignore second-level precision for hour and minutes computation.
    this._minutes = Math.floor(this._seconds / 60);
    this._hours = Math.floor(this._minutes / 60);
    this._minutes = this._minutes % 60;
  };

  /**
   * Gets duration as seconds.
   *
   * @param {boolean} imprecise
   *   Whether to remove second-level precision.
   *
   *   Defaults to false. When true, a duration of 95 seconds is treated as
   *   60 seconds, i.e. rounded down to the nearest full minute.
   *
   * @return {integer}
   *   Duration in seconds.
   */
  getSeconds(imprecise: boolean = false) {
    imprecise = imprecise === true;
    var output = this._seconds;

    // For imprecise output, round-down to the nearest full minute.
    if (imprecise) {
      output = output - output % 60;
    }

    return output;
  };

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
  setHHMM(hhmm) {
    var parts = null;

    // Parse hh only. Ex: 2 = 2h 00m.
    var pattern = /^(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      var parts = hhmm.match(pattern).slice(-1);
      parts.push('00');
    }

    // Parse hh:mm duration. Ex: 2:30 = 2h 30m.
    var pattern = /^(\d{0,2}):(\d{0,2})$/;
    if (hhmm.match(pattern)) {
      parts = hhmm.match(pattern).slice(-2);
      // Minutes must have 2 digits.
      if (parts[1].length < 2) {
        parts = null;
      }
      // Minutes cannot exceed 59 in this format.
      else if (parts[1] > 59) {
        parts = null;
      }
    }

    // Parse hh.mm as decimal. Ex: 2.5 = 2h 30m.
    var pattern = /^(\d{0,2})\.(\d{0,2})$/;
    if (!parts && hhmm.match(pattern)) {
      parts = hhmm.match(pattern).slice(-2);
      // Compute minutes.
      parts[1] = (60 * parts[1]) / Math.pow(10, parts[1].length);
      parts[1] = Math.round(parts[1]);
    }

    // No pattern matched? Throw error.
    if (!parts || parts.length !== 2) {
      throw 'Error: ' + hhmm + ' is not in hh:mm format.';
    }

    // Validate hours and minutes.
    parts[0] = (parts[0].length == 0) ? 0 : parseInt(parts[0]);
    parts[1] = (parts[1].length == 0) ? 0 : parseInt(parts[1]);
    if (isNaN(parts[0]) || isNaN(parts[1])) {
      throw 'Error: ' + hhmm + ' is not in hh:mm format.';
    }

    // Convert time to seconds and set the number of seconds.
    var secs = parts[0] * 60 * 60 + parts[1] * 60;
    this.setSeconds(secs);
  };

  /**
   * Gets the "hours" part of the duration.
   *
   * @param {boolean} force2
   *   Whether to force 2 digits.
   *
   * @return {integer|string}
   *   Hours in the duration.
   */
  getHours(force2) {
    force2 = force2 || false;
    var output = this._hours;
    if (force2) {
      output = ('00' + output).substr(-2);
    }
    return output;
  };

  /**
   * Gets the "minutes" part of the duration.
   *
   * @param {boolean} force2
   *   Whether to force 2 digits.
   *
   * @return {integer|string}
   *   Minutes in the duration.
   */
  getMinutes(force2) {
    force2 = force2 || false;
    var output = this._minutes;
    if (force2) {
      output = ('00' + output).substr(-2);
    }
    return output;
  };

  /**
   * Gets the duration as hours and minutes.
   *
   * @return string
   *   Time in hh:mm format.
   */
  asHHMM() {
    return this.getHours(true) + ':' + this.getMinutes(true);
  };

  /**
   * Gets the duration as hours in decimals.
   *
   * @param {boolean} ignoreSeconds
   *   Round down to the nearest full-minute.
   *
   *   Ex: 90 seconds is treated 60 seconds.
   *
   * @return string
   *   Time in hours (decimal). Ex: 1.5 for 1 hr 30 min.
   */
  asDecimal(ignoreSeconds) {
    var output = this.getSeconds(ignoreSeconds) / 3600;
    // Convert to hours. Ex: 0h 25m becomes 0.416.
    // Since toFixed rounds off the last digit, we ignore it.
    output = output.toFixed(3);
    output = output.substr(0, output.length - 1);
    return output;
  };

  /**
   * Add a duration.
   *
   * @param {*} duration
   */
  add(duration) {
    var oDuration = ('object' === typeof duration)
      ? duration : new Duration(duration);
    var seconds = this.getSeconds() + oDuration.getSeconds();
    this.setSeconds(seconds);
  };

  /**
   * Subtract a duration.
   *
   * @param {*} duration
   */
  sub(duration) {
    var oDuration = ('object' === typeof duration)
      ? duration : new Duration(duration);
    var seconds = this.getSeconds() - oDuration.getSeconds();
    // Duration cannot be negative.
    seconds = (seconds >= 0) ? seconds : 0;
    this.setSeconds(seconds);
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
    // Do nothing if rounding value is zero.
    if (0 === minutes) {
      return;
    }

    // Compute the rounding value as seconds.
    var seconds = minutes * 60;

    // Determine the amount of correction required.
    var correction = this.getSeconds() % seconds;

    // Do nothing if no correction / rounding is required.
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
        this.add(seconds - correction);
        break;

      case ROUND_DOWN:
        this.sub(correction);
        break;

      default:
        throw 'Invalid rounding direction. Please use one of ROUND_*.';
    }
  };
};
