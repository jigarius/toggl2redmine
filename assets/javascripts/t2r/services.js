import * as datetime from "./datetime.js";
import { RequestQueue } from "./request.js";
import { TemporaryStorage } from "./storage.js";
export class RedmineService {
    constructor(apiKey) {
        this._baseUrl = window.location.origin;
        this._apiKey = apiKey;
        this._cache = new TemporaryStorage();
        this.requestQueue = new RequestQueue();
    }
    request(opts) {
        opts.timeout = opts.timeout || 3000;
        if (opts.url.match(/^\//)) {
            opts.url = this._baseUrl + opts.url;
        }
        opts.headers = opts.headers || {};
        opts.headers['X-Redmine-API-Key'] = this._apiKey;
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
        var that = this;
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
        let opts = {};
        opts.url = '/time_entries.json';
        opts.data = {
            user_id: 'me',
            limit: 1,
            to: (new datetime.DateTime()).toHTMLDate()
        };
        let that = this;
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
        const data = {};
        data.from = params.from.toISOString();
        data.till = params.till.toISOString();
        if (params.workspaceId) {
            data.workspaces = params.workspaceId;
        }
        this.request({
            url: '/toggl2redmine/toggl/time_entries',
            data: data,
            success: (time_entries) => {
                this.handleRequestSuccess('Toggl time entries', time_entries);
                callback(time_entries);
            },
            error: () => {
                this.handleRequestError('Toggl time entries');
                callback(null);
            }
        });
    }
    getTogglWorkspaces(callback) {
        const workspaces = this._cache.get('toggl.workspaces');
        if (workspaces) {
            callback(workspaces);
            return;
        }
        var that = this;
        this.request({
            url: '/toggl2redmine/toggl/workspaces',
            success: (workspaces) => {
                that.handleRequestSuccess('Toggl workspaces', workspaces);
                that._cache.set('toggl.workspaces', workspaces);
                callback(workspaces);
            },
            error: () => {
                that.handleRequestError('Toggl workspaces');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUV6QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFBO0FBQ3pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGNBQWMsQ0FBQTtBQW9CN0MsTUFBTSxPQUFPLGNBQWM7SUFNekIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7UUFDcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO0lBQ3hDLENBQUM7SUFVRCxPQUFPLENBQUMsSUFBUztRQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUE7UUFHbkMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN6QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtTQUNwQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFFaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELG9CQUFvQixDQUFDLElBQVksRUFBRSxJ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