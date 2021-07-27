import {RequestQueue} from "./request.js";
import * as utils from "./utils.js";
import * as flash from "./flash.js";
import {translate as t} from "./i18n.js";

/**
 * Sends requests to Redmine API endpoints.
 */
export class RedmineService {
  readonly _apiKey: string
  readonly _baseUrl: string
  public requestQueue: RequestQueue

  constructor(apiKey: string) {
    this._baseUrl = window.location.origin
    this._apiKey = apiKey
    this.requestQueue = new RequestQueue()
  }

  /**
   * Sends an AJAX request to Redmine with the given options.
   *
   * Automatically injects auth headers.
   *
   * @param opts
   *   Request options.
   */
  request(opts: any) {
    opts.timeout = opts.timeout || 3000

    // Prepend Redmine URL for relative URLs.
    if (opts.url.match(/^\//)) {
      opts.url = this._baseUrl + opts.url
    }

    opts.headers = opts.headers || {}
    opts.headers['X-Redmine-API-Key'] = this._apiKey

    this.requestQueue.addItem(opts)
  }

  /**
   * Retrieves raw time entry data from Redmine.
   *
   * @param {Object} query
   *   Applied filters.
   * @param {function} callback
   *   Receives time entries or null.
   *
   * @todo
   *   Change argument order.
   */
  getRedmineTimeEntries(query: any, callback: any) {
    query = query || {};
    try {
      this.request({
        async: true,
        method: 'get',
        url: '/toggl2redmine/redmine/time_entries',
        data: {
          from: query.from,
          till: query.till
        },
        success: function (data: any) {
          var output = ('undefined' !== typeof data.time_entries)
            ? data.time_entries : [];
          callback(output);
        }
      });
    } catch (e) {
      callback(false);
    }
  }

  /**
   * Requests time entry activities.
   *
   * @param callback
   *   Will receive a list of time entry activities.
   *
   *   If the request fails, the callback will receive a null.
   */
  getTimeEntryActivities(callback: any) {
    this.request({
      url: '/enumerations/time_entry_activities.json',
      success: (data: any) => {
        callback(data.time_entry_activities)
      },
      error: () => {
        callback(null)
      }
    });
  }

  /**
   * Retrieves raw time entry data from Toggl.
   *
   * @param opts
   *   Applied filters.
   * @param {function} callback
   *   Receives Toggl time entry groups as an argument.
   *
   * @todo Change argument order.
   */
  getTogglTimeEntries(opts: any, callback: any) {
    opts = opts || {};
    var data: any = {};

    // Determine start date.
    opts.from = utils.dateStringToObject(opts.from);
    if (!opts.from) {
      alert('Error: Invalid start date!');
      return false;
    }
    data.from = opts.from.toISOString();

    // Determine end date.
    opts.till = utils.dateStringToObject(opts.till);
    if (!opts.till) {
      alert('Error: Invalid end date!');
      return false;
    }
    data.till = opts.till.toISOString();

    // Determine workspaces.
    if (opts.workspace) {
      data.workspaces = opts.workspace;
    }

    try {
      this.request({
        url: '/toggl2redmine/toggl/time_entries',
        data: data,
        success: function(data: any) {
          data = ('undefined' === typeof data) ? {} : data;
          callback(data);
        }
      });
    } catch(e) {
      console.error(e);
      callback(false);
    }
  }

  /**
   * Fetches all Toggl workspaces.
   *
   * @param {function} callback
   *   Receives workspaces or null.
   */
  getTogglWorkspaces(callback: any) {
    let opts: any = {}
    opts.url = '/toggl2redmine/toggl/workspaces'
    opts.success = (data: any[]) => {
      callback(data)
    }
    opts.error = () => {
      console.error('Fetch failed: toggl workspaces')
      callback(null)
    }

    this.request(opts)
  }

  /**
   * Fetches the last date on which time entries were found for the current user.
   *
   * Time entries for future dates are ignored.
   *
   * @param {function} callback
   *   Receives a Date object or null.
   * @param opts
   *   Options to be passed to jQuery.ajax().
   */
  getLastImportDate(callback: any, opts: any = null) {
    opts = opts || {}
    opts.url = '/time_entries.json'
    opts.data = {
      user_id: 'me',
      limit: 1,
      // Ignore entries made in the future.
      to: utils.dateFormatYYYYMMDD(new Date())
    }

    opts.success = (data: any) => {
      if (data.time_entries.length === 0) {
        callback(null)
        return
      }

      const lastTimeEntry = data.time_entries.pop()
      const lastImportDate: Date = utils.dateStringToObject(`${lastTimeEntry.spent_on} 00:00:00`)!
      callback(lastImportDate)
    }
    opts.error = () => {
      console.error('Fetch failed: last import date')
      callback(null)
    }

    this.request(opts)
  }

}
