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
    getTimeEntries(query, callback) {
        var that = this;
        this.request({
            async: true,
            method: 'get',
            url: '/toggl2redmine/redmine/time_entries',
            data: {
                from: query.from,
                till: query.till
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
    getLastImportDate(callback, opts = null) {
        opts = opts || {};
        opts.url = '/time_entries.json';
        opts.data = {
            user_id: 'me',
            limit: 1,
            to: utils.dateFormatYYYYMMDD(new Date())
        };
        var that = this;
        opts.success = (data) => {
            this.handleRequestSuccess('Last import date', data);
            if (data.time_entries.length === 0) {
                callback(null);
                return;
            }
            const lastTimeEntry = data.time_entries.pop();
            const lastImportDate = utils.dateStringToObject(`${lastTimeEntry.spent_on} 00:00:00`);
            callback(lastImportDate);
        };
        opts.error = () => {
            that.handleRequestError('Last import date');
            callback(null);
        };
        this.request(opts);
    }
    getTogglTimeEntries(query, callback) {
        const data = {};
        try {
            data.from = utils.dateStringToObject(query.from).toISOString();
        }
        catch (e) {
            console.error('Invalid start date', query.from);
            alert('Error: Invalid start date!');
        }
        try {
            data.till = utils.dateStringToObject(query.till).toISOString();
        }
        catch (e) {
            console.error('Invalid end date', query.till);
            alert('Error: Invalid end date!');
        }
        if (query.workspace) {
            data.workspaces = query.workspace;
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
    postTimeEntry(time_entry, toggl_ids, callback) {
        const that = this;
        this.request({
            async: true,
            url: '/toggl2redmine/import',
            method: 'post',
            data: JSON.stringify({
                time_entry: time_entry,
                toggl_ids: toggl_ids
            }),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssS0FBSyxNQUFNLFlBQVksQ0FBQTtBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFBO0FBQ3pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGNBQWMsQ0FBQTtBQWM3QyxNQUFNLE9BQU8sY0FBYztJQU16QixZQUFZLE1BQWM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFTO1FBQ2YsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQTtRQUduQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1NBQ3BDO1FBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUVoRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLElB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