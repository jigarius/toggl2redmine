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
                success: function (data) {
                    var output = ('undefined' !== typeof data.time_entries)
                        ? data.time_entries : [];
                    callback(output);
                }
            });
        }
        catch (e) {
            callback(false);
        }
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
    getTogglTimeEntries(opts, callback) {
        opts = opts || {};
        var data = {};
        opts.from = utils.dateStringToObject(opts.from);
        if (!opts.from) {
            alert('Error: Invalid start date!');
            return false;
        }
        data.from = opts.from.toISOString();
        opts.till = utils.dateStringToObject(opts.till);
        if (!opts.till) {
            alert('Error: Invalid end date!');
            return false;
        }
        data.till = opts.till.toISOString();
        if (opts.workspace) {
            data.workspaces = opts.workspace;
        }
        try {
            this.request({
                url: '/toggl2redmine/toggl/time_entries',
                data: data,
                success: function (data) {
                    data = ('undefined' === typeof data) ? {} : data;
                    callback(data);
                }
            });
        }
        catch (e) {
            console.error(e);
            callback(false);
        }
    }
    getTogglWorkspaces(callback) {
        let opts = {};
        opts.url = '/toggl2redmine/toggl/workspaces';
        opts.success = (data) => {
            callback(data);
        };
        opts.error = () => {
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
            callback(null);
        };
        this.request(opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQzFDLE9BQU8sS0FBSyxLQUFLLE1BQU0sWUFBWSxDQUFDO0FBT3BDLE1BQU0sT0FBTyxjQUFjO0lBS3pCLFlBQVksTUFBYztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0lBVUQsT0FBTyxDQUFDLElBQVM7UUFDZixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFBO1FBR25DLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDekIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7U0FDcEM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBRWhELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFhRCxxQkFBcUIsQ0FBQyxLQUFVLEVBQUUsUUFBYTtRQUM3QyxLQUFLLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNwQixJQUFJO1lBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDWCxLQUFLLEVBQUUs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