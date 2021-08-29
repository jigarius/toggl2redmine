import * as datetime from "./datetime.js"
import * as models from "./models.js"
import {RequestQueue} from "./request.js"
import {TemporaryStorage} from "./storage.js"
import {TimeEntryActivity} from "./models.js"

interface GetLastExportDateCallback {
  (date: datetime.DateTime | null): void
}

interface GetTimeEntriesParams {
  from: datetime.DateTime
  till: datetime.DateTime
}

interface GetTimeEntriesResponse {
  time_entries: models.TimeEntry[]
}

interface GetTimeEntriesCallback {
  (entries: models.TimeEntry[] | null): void
}

interface GetTimeEntryActivitiesResponse {
  time_entry_activities: models.TimeEntryActivity[]
}

interface GetTimeEntryActivitiesCallback {
  (activities: TimeEntryActivity[] | null): void
}

interface GetTogglTimeEntriesParams {
  from: datetime.DateTime
  till: datetime.DateTime
  workspaceId: number | null
}

interface GetTogglTimeEntriesCallback {
  (entries: models.KeyedTogglTimeEntryCollection): void
}

interface GetTogglWorkspacesCallback {
  (workspaces: models.TogglWorkspace[] | null): void
}

interface PostTimeEntryParams {
  time_entry: {
    spent_on: string
    issue_id: number
    comments: string
    activity_id: number | null
    hours: string
  },
  toggl_ids: number[]
}

interface PostTimeEntryCallback {
  (errors: string[]): void
}

/**
 * Sends requests to Redmine API endpoints.
 */
export class RedmineAPIService {
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
  request(opts: JQuery.AjaxSettings): void {
    if (!opts.url) throw 'Missing required parameter: url'

    if (opts.url.match(/^\//)) {
      opts.url = this._baseUrl + opts.url
    }

    opts.headers = opts.headers || {}
    opts.headers['X-Redmine-API-Key'] = this._apiKey
    opts.timeout = opts.timeout || 3000

    this.requestQueue.addItem(opts)
  }

  handleRequestSuccess<Type>(type: string, data: Type): void {
    console.debug(`Request succeeded: ${type}`, data)
  }

  handleRequestError(type: string): void {
    console.error(`Request failed: ${type}`)
  }

  /**
   * Fetches Redmine time entries.
   *
   * @param {object} params
   *   Query parameters.
   * @param {function} callback
   *   Receives time entries or null.
   */
  getTimeEntries(params: GetTimeEntriesParams, callback: GetTimeEntriesCallback): void {
    const that = this
    this.request({
      async: true,
      method: 'get',
      url: '/toggl2redmine/redmine/time_entries',
      data: {
        from: params.from.toISOString(true),
        till: params.till.toISOString(true)
      },
      success: function (data: GetTimeEntriesResponse) {
        if (typeof data.time_entries === 'undefined') {
          that.handleRequestError('Redmine time entries')
          callback(null)
          return
        }

        that.handleRequestSuccess('Redmine time entries', data)

        const time_entries: models.TimeEntry[] = data.time_entries.map((entry: models.TimeEntry) => {
          entry.duration = new datetime.Duration(
            Math.floor(parseFloat(entry.hours) * 3600)
          )
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
  getTimeEntryActivities(callback: GetTimeEntryActivitiesCallback): void {
    const activities: TimeEntryActivity[] = this._cache.get('redmine.activities')
    if (activities) {
      callback(activities)
      return
    }

    const that = this
    this.request({
      url: '/enumerations/time_entry_activities.json',
      success: (data: GetTimeEntryActivitiesResponse) => {
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
   * Fetches the last date on which time entries were found for the current user.
   *
   * Time entries for future dates are ignored.
   *
   * @param {GetLastExportDateCallback} callback
   *   Receives a Date object or null.
   */
  getLastImportDate(callback: GetLastExportDateCallback): void {
    const opts: JQuery.AjaxSettings = {}
    opts.url = '/time_entries.json'
    opts.data = {
      user_id: 'me',
      limit: 1,
      // Ignore entries made in the future.
      to: (new datetime.DateTime()).toHTMLDate()
    }

    const that = this
    opts.success = (data: GetTimeEntriesResponse) => {
      this.handleRequestSuccess('Last import date', data)
      if (data.time_entries.length === 0) {
        callback(null)
        return
      }

      const lastTimeEntry = data.time_entries.pop() as models.TimeEntry
      const lastImportDate = datetime.DateTime.fromString(`${lastTimeEntry.spent_on} 00:00:00`)
      callback(lastImportDate)
    }
    opts.error = () => {
      that.handleRequestError('Last import date')
      callback(null)
    }

    this.request(opts)
  }

  /**
   * Fetches Toggl time entries.
   *
   * @param {object} params
   *   Query parameters.
   * @param {function} callback
   *   Receives Toggl time entry groups or null.
   */
  getTogglTimeEntries(params: GetTogglTimeEntriesParams, callback: GetTogglTimeEntriesCallback): void {
    const data = {
      from: params.from.toISOString(),
      till: params.till.toISOString(),
      // @todo Rename workspaces to workspaceId
      workspaces: params.workspaceId || null
    }

    this.request({
      url: '/toggl2redmine/toggl/time_entries',
      data: data,
      success: (time_entries: models.KeyedTogglTimeEntryCollection) => {
        this.handleRequestSuccess('Toggl time entries', time_entries)
        callback(time_entries)
      },
      error: () => {
        this.handleRequestError('Toggl time entries')
        callback({})
      }
    })
  }

  /**
   * Fetches and caches Toggl workspaces.
   *
   * @param {function} callback
   *   Receives workspaces or null.
   */
  getTogglWorkspaces(callback: GetTogglWorkspacesCallback): void {
    const workspaces = this._cache.get('toggl.workspaces')
    if (workspaces) {
      callback(workspaces)
      return
    }

    const that = this
    this.request({
      url: '/toggl2redmine/toggl/workspaces',
      success: (workspaces: models.TogglWorkspace[]) => {
        that.handleRequestSuccess('Toggl workspaces', workspaces)
        that._cache.set('toggl.workspaces', workspaces)
        callback(workspaces)
      },
      error: () => {
        that.handleRequestError('Toggl workspaces')
        callback(null)
      }
    })
  }

  /**
   * Attempts to create a Time Entry on Redmine.
   *
   * @param {PostTimeEntryParams} params
   *   Time entry data.
   * @param {PostTimeEntryCallback} callback
   *   Receives an array of error messages, which is empty on success.
   */
  postTimeEntry(params: PostTimeEntryParams, callback: PostTimeEntryCallback): void {
    const that = this
    this.request({
      async: true,
      url: '/toggl2redmine/import',
      method: 'post',
      data: JSON.stringify(params),
      contentType: 'application/json',
      success: (data: string[]) => {
        that.handleRequestSuccess('Time entry import', data)
        callback([])
      },
      error: function(xhr: JQuery.jqXHR) {
        that.handleRequestError('Time entry import')
        let errors: string[]

        try {
          const oResponse = JSON.parse(xhr.responseText)
          errors = (typeof oResponse.errors === 'undefined') ? ['Unknown error'] : oResponse.errors
        } catch (e) {
          errors = ['The server returned an unexpected response']
        }

        callback(errors)
      }
    });
  }

}
