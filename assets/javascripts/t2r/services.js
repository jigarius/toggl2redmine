import { RequestQueue } from "./request.js";
import * as utils from "./utils.js";
export class RedmineService {
    constructor(apiKey) {
        this._baseUrl = window.location.origin;
        this._apiKey = apiKey;
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
        let opts = {};
        opts.url = '/toggl2redmine/toggl/workspaces';
        opts.success = (data) => {
            callback(data);
        };
        opts.error = () => {
            console.error('Fetch failed: toggl workspaces');
            callback(null);
        };
        this.request(opts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sWUFBWSxDQUFDO0FBT3BDLE1BQU0sT0FBTyxjQUFjO0lBS3pCLFlBQVksTUFBYztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0lBVUQsT0FBTyxDQUFDLElBQVM7UUFDZixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFBO1FBR25DLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDekIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7U0FDcEM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBRWhELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFZRCxxQkFBcUIsQ0FBQyxLQUFVLEVBQUUsUUFBYTtRQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ1gsS0FBSyxFQUFFLElBQUk7WUFDWCxNQUFNLEVBQUUsS0FBSztZQUNiLEdBQUcsRUFBRSxxQ0FBcUM7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