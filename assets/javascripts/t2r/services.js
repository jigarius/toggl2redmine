import * as datetime from "./datetime.js";
import { RequestQueue } from "./request.js";
import { TemporaryStorage } from "./storage.js";
export class RedmineAPIService {
    constructor(apiKey) {
        this._baseUrl = window.location.origin;
        this._apiKey = apiKey;
        this._cache = new TemporaryStorage();
        this.requestQueue = new RequestQueue();
    }
    request(opts) {
        if (!opts.url)
            throw 'Missing required parameter: url';
        if (opts.url.match(/^\//)) {
            opts.url = this._baseUrl + opts.url;
        }
        opts.headers = opts.headers || {};
        opts.headers['X-Redmine-API-Key'] = this._apiKey;
        opts.timeout = opts.timeout || 3000;
        this.requestQueue.addItem(opts);
    }
    handleRequestSuccess(type, data) {
        console.debug(`Request succeeded: ${type}`, data);
    }
    handleRequestError(type) {
        console.error(`Request failed: ${type}`);
    }
    getTimeEntries(params, callback) {
        const that = this;
        this.request({
            async: true,
            method: 'get',
            url: '/toggl2redmine/redmine/time_entries',
            data: {
                from: params.from.toISOString(true),
                till: params.till.toISOString(true)
            },
            success: function (data) {
                if (typeof data.time_entries === 'undefined') {
                    that.handleRequestError('Redmine time entries');
                    callback(null);
                    return;
                }
                that.handleRequestSuccess('Redmine time entries', data);
                const time_entries = data.time_entries.map((entry) => {
                    entry.duration = new datetime.Duration(Math.floor(parseFloat(entry.hours) * 3600));
                    return entry;
                });
                callback(time_entries);
            },
            error: () => {
                that.handleRequestError('Redmine time entries');
                callback(null);
            }
        });
    }
    getTimeEntryActivities(callback) {
        const activities = this._cache.get('redmine.activities');
        if (activities) {
            callback(activities);
            return;
        }
        const that = this;
        this.request({
            url: '/enumerations/time_entry_activities.json',
            success: (data) => {
                that.handleRequestSuccess('Time entry activities', data);
                that._cache.set('redmine.activities', data.time_entry_activities);
                callback(data.time_entry_activities);
            },
            error: () => {
                that.handleRequestError('Time entry activities');
                callback(null);
            }
        });
    }
    getLastImportDate(callback) {
        const opts = {};
        opts.url = '/time_entries.json';
        opts.data = {
            user_id: 'me',
            limit: 1,
            to: (new datetime.DateTime()).toHTMLDate()
        };
        const that = this;
        opts.success = (data) => {
            this.handleRequestSuccess('Last import date', data);
            if (data.time_entries.length === 0) {
                callback(null);
                return;
            }
            const lastTimeEntry = data.time_entries.pop();
            const lastImportDate = datetime.DateTime.fromString(`${lastTimeEntry.spent_on} 00:00:00`);
            callback(lastImportDate);
        };
        opts.error = () => {
            that.handleRequestError('Last import date');
            callback(null);
        };
        this.request(opts);
    }
    getTogglTimeEntries(params, callback) {
        const data = {
            from: params.from.toISOString(),
            till: params.till.toISOString(),
            workspaces: params.workspaceId || null
        };
        this.request({
            url: '/toggl2redmine/toggl/time_entries',
            data: data,
            success: (time_entries) => {
                this.handleRequestSuccess('Toggl time entries', time_entries);
                callback(time_entries);
            },
            error: () => {
                this.handleRequestError('Toggl time entries');
                callback({});
            }
        });
    }
    getTogglWorkspaces(callback) {
        const workspaces = this._cache.get('toggl.workspaces');
        if (workspaces) {
            callback(workspaces);
            return;
        }
        const that = this;
        this.request({
            url: '/toggl2redmine/toggl/workspaces',
            success: (workspaces) => {
                that.handleRequestSuccess('Toggl workspaces', workspaces);
                that._cache.set('toggl.workspaces', workspaces);
                callback(workspaces);
            },
            error: () => {
                that.handleRequestError('Toggl workspaces');
                callback(null);
            }
        });
    }
    postTimeEntry(params, callback) {
        const that = this;
        this.request({
            async: true,
            url: '/toggl2redmine/import',
            method: 'post',
            data: JSON.stringify(params),
            contentType: 'application/json',
            success: (data) => {
                that.handleRequestSuccess('Time entry import', data);
                callback([]);
            },
            error: function (xhr) {
                that.handleRequestError('Time entry import');
                let errors;
                try {
                    const oResponse = JSON.parse(xhr.responseText);
                    errors = (typeof oResponse.errors === 'undefined') ? ['Unknown error'] : oResponse.errors;
                }
                catch (e) {
                    errors = ['The server returned an unexpected response'];
                }
                callback(errors);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUV6QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFBO0FBQ3pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGNBQWMsQ0FBQTtBQTREN0MsTUFBTSxPQUFPLGlCQUFpQjtJQU01QixZQUFZLE1BQWM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUF5QjtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUc7WUFBRSxNQUFNLGlDQUFpQyxDQUFBO1FBRXRELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDekIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7U0FDcEM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQ2hELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUE7UUFFbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENB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