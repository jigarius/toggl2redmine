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
        console.debug(`Fetched: ${type}`, data);
    }
    handleRequestError(type) {
        console.error(`Fetch failed: ${type}`);
    }
    getRedmineTimeEntries(query, callback) {
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
                    console.error('Fetch failed: redmine time entries.');
                    callback(null);
                    return;
                }
                let time_entries = ('undefined' !== typeof data.time_entries)
                    ? data.time_entries : [];
                time_entries = time_entries.map((entry) => {
                    entry.duration = Math.floor(parseFloat(entry.hours) * 3600);
                    return entry;
                });
                console.debug('Fetched Redmine time entries', time_entries);
                callback(time_entries);
            },
            error: () => {
                callback(null);
            }
        });
    }
    getTimeEntryActivities(callback) {
        this.request({
            url: '/enumerations/time_entry_activities.json',
            success: (data) => {
                callback(data.time_entry_activities);
            },
            error: () => {
                callback(null);
            }
        });
    }
    getTogglTimeEntries(query, callback) {
        let data = {};
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
                console.debug('Fetched Toggl time entries', time_entries);
                callback(time_entries);
            },
            error: () => {
                console.error('Fetch failed: toggl time entries');
                callback(null);
            }
        });
    }
    getTogglWorkspaces(callback) {
        let workspaces = this._cache.get('toggl.workspaces');
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
    getLastImportDate(callback, opts = null) {
        opts = opts || {};
        opts.url = '/time_entries.json';
        opts.data = {
            user_id: 'me',
            limit: 1,
            to: utils.dateFormatYYYYMMDD(new Date())
        };
        opts.success = (data) => {
            if (data.time_entries.length === 0) {
                callback(null);
                return;
            }
            const lastTimeEntry = data.time_entries.pop();
            const lastImportDate = utils.dateStringToObject(`${lastTimeEntry.spent_on} 00:00:00`);
            callback(lastImportDate);
        };
        opts.error = () => {
            console.error('Fetch failed: last import date');
            callback(null);
        };
        this.request(opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssS0FBSyxNQUFNLFlBQVksQ0FBQTtBQUNuQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFBO0FBQ3pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGNBQWMsQ0FBQTtBQUs3QyxNQUFNLE9BQU8sY0FBYztJQU16QixZQUFZLE1BQWM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFTO1FBQ2YsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQTtRQUduQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1NBQ3BDO1FBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUVoRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBWSxFQUFFLElB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