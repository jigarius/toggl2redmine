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
                    entry.duration = Math.floor(parseFloat(entry.hours) * 3600);
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