import * as utils from "./utils.js"
import {RequestQueue} from "./request.js"
import {TemporaryStorage} from "./storage.js"

/**
 * Sends requests to Redmine API endpoints.
 */
export class RedmineService {
  readonly _apiKey: string
  readonly _baseUrl: string
  readonly _cache: TemporaryStorage
  public requestQueue: RequestQueue

  constructor(apiKey: string) {
    this._baseUrl = window.location.origin
    this._apiKey = apiKey
    this._cache = new TemporaryStorage()
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

  handleRequestSuccess(type: string, data: any) {
    console.debug(`Fetched: ${type}`, data)
  }

  handleRequestError(type: string) {
    console.error(`Fetch failed: ${type}`)
  }

  /**
   * Fetches Redmine time entries.
   *
   * @param {Object} query
   *   Applied filters.
   * @param {function} callback
   *   Receives time entries or null.
   *
   * @todo Perform query validation.
   */
  getRedmineTimeEntries(query: any, callback: any) {
    var that = this
    this.request({
      async: true,
      method: 'get',
      url: '/toggl2redmine/redmine/time_entries',
      data: {
        from: query.from,
        till: query.till
      },
      success: function (data: any) {
        if (typeof data.time_entries === 'undefined') {
          that.handleRequestError('Redmine time entries')
          callback(null)
          return
        }

        that.handleRequestSuccess('Redmine time entries', data)

        let time_entries: any[] = data.time_entries.map((entry: any) => {
          entry.duration = Math.floor(parseFloat(entry.hours) * 3600)
          return entry
        })

        callback(time_entries);
      },
      error: () => {
        that.handleRequestError('Redmine time entries')
        callback(null)
      }
    });
  }

  /**
   * Fetches and caches time entry activities.
   *
   * @param callback
   *   function (activities, null) {}
   */
  getTimeEntryActivities(callback: any) {
    const activities: any[] = this._cache.get('redmine.activities')
    if (activities) {
      callback(activities)
      return
    }

    var that = this
    this.request({
      url: '/enumerations/time_entry_activities.json',
      success: (data: any) => {
        that.handleRequestSuccess('Time entry activities', data)
        that._cache.set('redmine.activities', data.time_entry_activities)
        callback(data.time_entry_activities)
      },
      error: () => {
        that.handleRequestError('Time entry activities')
        callback(null)
      }
    });
  }

  /**
   * Fetches Toggl time entries.
   *
   * @param query
   *   Filters to be applied, e.g. from, till, workspace.
   * @param {function} callback
   *   Receives Toggl time entry groups or null.
   *
   * @todo Improve query validation.
   */
  getTogglTimeEntries(query: any, callback: any) {
    let data: any = {}

    // Determine start date.
    try {
      data.from = utils.dateStringToObject(query.from)!.toISOString()
    } catch(e) {
      console.error('Invalid start date', query.from)
      alert('Error: Invalid start date!')
    }

    // Determine end date.
    try {
      data.till = utils.dateStringToObject(query.till)!.toISOString()
    } catch(e) {
      console.error('Invalid end date', query.till)
      alert('Error: Invalid end date!');
    }

    // Filter by workspace?
    if (query.workspace) {
      data.workspaces = query.workspace
    }

    this.request({
      url: '/toggl2redmine/toggl/time_entries',
      data: data,
      success: (time_entries: any) => {
        this.handleRequestSuccess('Toggl time entries', time_entries)
        callback(time_entries)
      },
      error: () => {
        this.handleRequestError('Toggl time entries')
        callback(null)
      }
    })
  }

  /**
   * Fetches and caches Toggl workspaces.
   *
   * @param {function} callback
   *   Receives workspaces or null.
   */
  getTogglWorkspaces(callback: any) {
    let workspaces = this._cache.get('toggl.workspaces')
    if (workspaces) {
      callback(workspaces)
      return
    }

    var that = this
    this.request({
      url: '/toggl2redmine/toggl/workspaces',
      success: (workspaces: any[]) => {
        that.handleRequestSuccess('Toggl workspaces', workspaces)
        that._cache.set('toggl.workspaces', workspaces)
        callback(workspaces)
      },
      error: () => {
        that.handleRequestError('Toggl workspaces')
      }
    })
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

    var that = this
    opts.success = (data: any) => {
      this.handleRequestSuccess('Last import date', data)
      if (data.time_entries.length === 0) {
        callback(null)
        return
      }

      const lastTimeEntry = data.time_entries.pop()
      const lastImportDate: Date = utils.dateStringToObject(`${lastTimeEntry.spent_on} 00:00:00`)!
      callback(lastImportDate)
    }
    opts.error = () => {
      that.handleRequestError('Last import date')
      callback(null)
    }

    this.request(opts)
  }

}
