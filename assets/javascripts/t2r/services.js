import * as datetime from "./datetime.js";
import * as utils from "./utils.js";
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
                from: params.from,
                till: params.till
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
            to: utils.dateFormatYYYYMMDD(new Date())
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
        try {
            data.from = utils.dateStringToObject(params.from).toISOString();
        }
        catch (e) {
            console.error('Invalid start date', params.from);
            alert('Error: Invalid start date!');
        }
        try {
            data.till = utils.dateStringToObject(params.till).toISOString();
        }
        catch (e) {
            console.error('Invalid end date', params.till);
            alert('Error: Invalid end date!');
        }
        if (params.workspace) {
            data.workspaces = params.workspace;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLFlBQVksQ0FBQTtBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFBO0FBQ3pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGNBQWMsQ0FBQTtBQW9CN0MsTUFBTSxPQUFPLGNBQWM7SUFNekIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7UUFDcEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO0lBQ3hDLENBQUM7SUFVRCxPQUFPLENBQUMsSUFBUztRQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUE7UUFHbkMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN6QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtTQUNwQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFFaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFD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