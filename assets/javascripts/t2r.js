const T2R_REDMINE_URL = window.location.origin;
import { LocalStorage as T2RLocalStorage } from "./t2r/storage/LocalStorage.js";
import { TemporaryStorage as T2RTemporaryStorage } from "./t2r/storage/TemporaryStorage.js";
let T2R = {
    cacheData: {},
    localStorage: new T2RLocalStorage(),
    tempStorage: new T2RTemporaryStorage()
};
T2R.initialize = function () {
    T2RWidget.initialize();
    T2R.initTogglReport();
    T2R.initFilterForm();
    T2R.updateLastImported();
    T2R.initPublishForm();
};
T2R.t = function (key, vars = {}) {
    if (T2R_TRANSLATIONS[key] === undefined) {
        var lang = $('html').attr('lang') || '??';
        return 'translation missing: ' + lang + '.' + key;
    }
    var result = T2R_TRANSLATIONS[key];
    for (var v in vars) {
        result = result.replace('@' + v, vars[v]);
    }
    return result;
};
T2R.FAKE_CALLBACK = function (data) {
    console.warn('No callback was provided to handle this data: ', data);
};
T2R.cache = function (key, value = null) {
    if (2 === arguments.length) {
        T2R.cacheData[key] = value;
        return value;
    }
    else {
        return ('undefined' === typeof T2R.cacheData[key])
            ? null : T2R.cacheData[key];
    }
};
T2R.flash = function (message, type = 'notice', timeout = false) {
    type = type || 'notice';
    timeout = ('number' === typeof timeout) ? timeout : false;
    var $message = $('<div class="flash t2r ' + type + '">' + message.trim() + '</div>');
    $('#content').prepend($message);
    if (timeout) {
        setTimeout(function () {
            $message.remove();
        }, timeout * 1000);
    }
};
T2R.clearFlashMessages = function () {
    $('.t2r.flash').remove();
};
T2R.htmlEntityEncode = function (string) {
    var output = $('<div />')
        .text(string)
        .text()
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return output;
};
T2R.getFilterForm = function () {
    return $('#filter-form');
};
T2R.getPublishForm = function () {
    return $('#publish-form');
};
T2R.getTogglTable = function () {
    return $('#toggl-report');
};
T2R.getRedmineTable = function () {
    return $('#redmine-report');
};
T2R.initTogglReport = function () {
    T2R.getTogglTable()
        .find('input.check-all')
        .tooltip()
        .change(function () {
        var checked = $(this).prop('checked');
        var $table = T2R.getTogglTable();
        $table.find('tbody input.cb-import:enabled')
            .prop('checked', checked)
            .trigger('change');
    });
};
T2R.initFilterForm = function () {
    var $form = T2R.getFilterForm();
    $form.find('#btn-apply-filters').click(function () {
        T2R.handleFilterForm();
        return false;
    });
    $form.find('#btn-reset-filters').click(function () {
        T2R.resetFilterForm();
        return false;
    });
    $form.find('[title]').tooltip();
    $form.submit(function (e) {
        e.preventDefault();
        T2R.handleFilterForm();
    });
    var data = {
        date: T2R.getDateFromLocationHash()
    };
    T2R.resetFilterForm(data);
};
T2R.resetFilterForm = function (data) {
    data = data || {};
    var defaults = {
        date: T2R.dateFormatYYYYMMDD().substr(0, 10),
        'toggl-workspace': T2R.localStorage.get('t2r.toggl-workspace'),
        'default-activity': T2R.localStorage.get('t2r.default-activity'),
        'rounding-value': T2R.localStorage.get('t2r.rounding-value'),
        'rounding-direction': T2R.localStorage.get('t2r.rounding-direction')
    };
    for (var name in defaults) {
        var value = data[name];
        if ('undefined' == typeof value || '' === value || false === value) {
            data[name] = defaults[name];
        }
    }
    T2R.getFilterForm().find(':input')
        .each(function () {
        var $field = $(this).val('');
        var name = $field.attr('name');
        switch (name) {
            case 'default-activity':
            case 'toggl-workspace':
                $field
                    .data('selected', data[name])
                    .val(data[name]);
                break;
            default:
                if ('undefined' !== typeof data[name]) {
                    $field.val(data[name]);
                }
                break;
        }
    });
    T2R.handleFilterForm();
};
T2R.handleFilterForm = function () {
    var $defaultActivity = $('select#default-activity');
    var defaultActivity = $defaultActivity.val();
    if (null === defaultActivity) {
        defaultActivity = $defaultActivity.data('selected');
    }
    T2R.localStorage.set('t2r.default-activity', defaultActivity);
    var $togglWorkspace = $('select#toggl-workspace');
    var togglWorkspace = $togglWorkspace.val();
    if (null === togglWorkspace) {
        togglWorkspace = $togglWorkspace.data('selected');
    }
    T2R.localStorage.set('t2r.toggl-workspace', togglWorkspace);
    var roundingValue = $('input#rounding-value').val() || 0;
    roundingValue = parseInt(roundingValue);
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
    T2R.localStorage.set('t2r.rounding-value', roundingValue);
    var roundingDirection = $('select#rounding-direction').val();
    T2R.localStorage.set('t2r.rounding-direction', roundingDirection);
    var $date = $('#date');
    var sDate = $date.val();
    try {
        if (!sDate) {
            throw 'Invalid date.';
        }
        var oDate = T2R.dateStringToObject(sDate + ' 00:00:00');
    }
    catch (e) {
        $date.focus();
        return false;
    }
    T2R.tempStorage.set('date', sDate);
    window.location.hash = T2R.tempStorage.get('date');
    $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');
    console.info('Filter form updated: ', {
        'date': T2R.tempStorage.get('date'),
        'default-activity': T2R.localStorage.get('t2r.default-activity'),
        'toggl-workspace': T2R.localStorage.get('t2r.toggl-workspace'),
        'rounding-value': T2R.localStorage.get('t2r.rounding-value'),
        'rounding-direction': T2R.localStorage.get('t2r.rounding-direction')
    });
    setTimeout(function () {
        T2R.updateRedmineReport();
        T2R.updateTogglReport();
    }, 250);
    T2R.unlockPublishForm();
};
T2R.initPublishForm = function () {
    T2R.getPublishForm().submit(T2R.handlePublishForm);
};
T2R.lockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').attr('disabled', 'disabled');
};
T2R.unlockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').removeAttr('disabled');
};
T2R.handlePublishForm = function () {
    if (confirm('This action cannot be undone. Do you really want to continue?')) {
        setTimeout(T2R.publishToRedmine);
    }
    return false;
};
T2R.getDateFromLocationHash = function () {
    var output = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
    output = output ? output.pop() : false;
    if (output && !T2R.dateStringToObject(output)) {
        output = false;
    }
    console.debug('Got date from URL fragment', output);
    return output;
};
T2R.publishToRedmine = function () {
    T2R.lockPublishForm();
    T2R.clearFlashMessages();
    var $checkboxes = $('#toggl-report tbody tr input.cb-import');
    if ($checkboxes.filter(':checked').length <= 0) {
        T2R.flash('Please select the entries which you want to import to Redmine.', 'error');
        T2R.unlockPublishForm();
        return;
    }
    console.info('Pushing time entries to Redmine.');
    $('#toggl-report tbody tr').each(function () {
        var $tr = $(this);
        var toggl_entry = $tr.data('t2r.entry');
        var $checkbox = $tr.find('input.cb-import');
        if (!$checkbox.prop('checked')) {
            return;
        }
        var redmine_entry = {
            spent_on: T2R.tempStorage.get('date'),
            issue_id: parseInt($tr.find('[data-property="issue_id"]').val()),
            comments: $tr.find('[data-property="comments"]').val(),
            activity_id: parseInt($tr.find('[data-property="activity_id"]').val()),
        };
        var durationInput = $tr.find('[data-property="hours"]').val();
        var duration = new T2RDuration();
        try {
            duration.setHHMM(durationInput);
            redmine_entry.hours = duration.asDecimal(true);
        }
        catch (e) {
            console.warn('Invalid duration. Ignoring entry.', redmine_entry);
            return;
        }
        if (duration.getSeconds(true) <= 0) {
            console.warn('Duration is zero. Ignoring entry.', redmine_entry);
        }
        var data = {
            time_entry: redmine_entry,
            toggl_ids: toggl_entry.ids
        };
        T2R.redmineRequest({
            async: true,
            url: '/toggl2redmine/import',
            method: 'post',
            context: $tr,
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (data, status, xhr) {
                console.debug('Request successful', data);
                var $tr = $(this).addClass('t2r-success');
                $checkbox.removeAttr('checked');
                $tr.find(':input').attr('disabled', 'disabled');
                var $message = T2RRenderer.render('StatusLabel', {
                    label: 'Imported',
                    description: 'Successfully imported to Redmine.',
                });
                $tr.find('td.status').html($message);
            },
            error: function (xhr, textStatus) {
                console.error('Request failed');
                var $tr = $(this).addClass('t2r-error');
                var status = {
                    label: 'Failed',
                    icon: 'error'
                };
                var sR = xhr.responseText || 'false';
                try {
                    var oR = jQuery.parseJSON(sR);
                    var errors = ('undefined' === typeof oR.errors)
                        ? 'Unknown error' : oR.errors;
                }
                catch (e) {
                    var errors = 'The server returned non-JSON response';
                }
                if (errors) {
                    errors = ('string' === typeof errors)
                        ? [errors] : errors;
                    status.description = errors.join("\n");
                }
                var $message = T2RRenderer.render('StatusLabel', status);
                $tr.find('td.status').html($message);
            }
        });
    });
    T2R.__publishWatcher = setInterval(function () {
        if (T2RAjaxQueue.isEmpty()) {
            clearInterval(T2R.__publishWatcher);
            T2R.unlockPublishForm();
            T2R.updateRedmineReport();
            T2R.updateLastImported();
        }
    }, 250);
};
T2R.getBasicAuthHeader = function (username, password) {
    var userpass = username + ':' + password;
    return {
        Authorization: 'Basic ' + btoa(userpass)
    };
};
T2R.dateStringToObject = function (string) {
    try {
        var dateParts = string.split(/[^\d]/);
        if (dateParts.length < 3) {
            throw ('Date must contain at least YYYY-MM-DD');
        }
        for (var i = 3; i <= 6; i++) {
            if (typeof dateParts[i] === 'undefined') {
                dateParts[i] = 0;
            }
        }
        dateParts[1] = parseInt(dateParts[1]);
        dateParts[1] -= 1;
        return new Date(dateParts[0], dateParts[1], dateParts[2], dateParts[3], dateParts[4], dateParts[5], dateParts[6]);
    }
    catch (e) {
        console.error('Date not understood', string);
        return false;
    }
};
T2R.dateFormatYYYYMMDD = function (date) {
    date = date || new Date();
    var yyyy = date.getFullYear();
    var m = date.getMonth() + 1;
    var mm = ('00' + m).substr(-2);
    var d = date.getDate();
    var dd = ('00' + d).substr(-2);
    return yyyy + '-' + mm + '-' + dd;
};
T2R.getTogglWorkspaces = function (callback) {
    var key = 'toggl.workspaces';
    callback = callback || T2R.FAKE_CALLBACK;
    var workspaces = T2R.cache(key);
    if (workspaces) {
        callback(workspaces);
        return;
    }
    T2R.redmineRequest({
        url: '/toggl2redmine/toggl/workspaces',
        success: function (data, status, xhr) {
            workspaces = data;
            T2R.cache(key, workspaces);
            if (workspaces.length > 0) {
                T2R.tempStorage.set('default_toggl_workspace', workspaces[0].id);
            }
            callback(workspaces);
        },
        error: function (xhr, textStatus) {
            console.error('Could not load Toggl workspaces.');
            T2R.flash(T2R.t('t2r.error.ajax_load'), 'error');
            callback([]);
        }
    });
};
T2R._getRawTogglTimeEntries = function (opts, callback) {
    opts = opts || {};
    var data = {};
    opts.from = T2R.dateStringToObject(opts.from);
    if (!opts.from) {
        alert('Error: Invalid start date!');
        return false;
    }
    data.from = opts.from.toISOString();
    opts.till = T2R.dateStringToObject(opts.till);
    if (!opts.till) {
        alert('Error: Invalid end date!');
        return false;
    }
    data.till = opts.till.toISOString();
    if (opts.workspace) {
        data.workspaces = opts.workspace;
    }
    try {
        T2R.redmineRequest({
            url: '/toggl2redmine/toggl/time_entries',
            data: data,
            success: function (data, status, xhr) {
                data = ('undefined' === typeof data) ? {} : data;
                callback(data);
            }
        });
    }
    catch (e) {
        console.error(e);
        callback(false);
    }
};
T2R.getTogglTimeEntries = function (opts, callback) {
    opts = opts || {};
    callback = callback || T2R.FAKE_CALLBACK;
    T2R._getRawTogglTimeEntries(opts, function (entries) {
        var output = [];
        var roundingValue = T2R.localStorage.get('t2r.rounding-value');
        var roundingDirection = T2R.localStorage.get('t2r.rounding-direction');
        for (var key in entries) {
            var entry = entries[key];
            console.groupCollapsed('Received Toggl entry: ' + key);
            console.debug('Toggl time entry: ', entry);
            entry.errors = entry.errors || [];
            entry.duration = new T2RDuration(Math.max(0, entry.duration));
            entry.roundedDuration = new T2RDuration(entry.duration.getSeconds(false));
            if (roundingDirection !== '' && roundingValue > 0) {
                entry.roundedDuration.roundTo(roundingValue, roundingDirection);
            }
            else {
                entry.roundedDuration.roundTo(1, T2RDuration.ROUND_REGULAR);
            }
            if (entry.duration.getSeconds(false) !== entry.roundedDuration.getSeconds(false)) {
                console.debug('Duration rounded.', {
                    from: entry.duration.asHHMM(),
                    to: entry.roundedDuration.asHHMM()
                });
            }
            else {
                console.debug('Duration not rounded.', entry.duration.asHHMM());
            }
            if (!entry.issue_id) {
                entry.errors.push('Could not determine issue ID. Please mention the Redmine issue ID in your Toggl task description. Example: "#1919 Feed the bunny wabbit"');
            }
            if (entry.issue_id && !entry.issue) {
                entry.errors.push('This issue was either not found on Redmine or you don\'t have access to it. Make sure you\'re using a correct issue ID and that you\'re a member of the project.');
            }
            output.push(entry);
            console.groupEnd();
        }
        callback(output);
    });
};
T2R.updateTogglReport = function () {
    var $table = T2R.getTogglTable().addClass('t2r-loading');
    $table.find('tbody').html('');
    var date = T2R.tempStorage.get('date');
    var opts = {
        from: date + ' 00:00:00',
        till: date + ' 23:59:59',
        workspace: T2R.localStorage.get('t2r.toggl-workspace')
    };
    T2R.updateTogglReportLink({
        date: date,
        workspace: opts.workspace
    });
    T2R.lockPublishForm();
    var $checkAll = $table.find('.check-all')
        .prop('checked', false)
        .attr('disabled', 'disabled');
    T2R.getTogglTimeEntries(opts, function (entries) {
        var $table = T2R.getTogglTable();
        var pendingEntriesExist = false;
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'running') {
                var $tr = T2RRenderer.render('TogglRow', entry);
                var entry = $tr.data('t2r.entry');
                $table.find('tbody').append($tr);
                delete entries[key];
            }
        }
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length === 0) {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                pendingEntriesExist = true;
            }
        }
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length > 0) {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'imported') {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }
        if (0 === entries.length) {
            var markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + T2R.t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').append(markup);
        }
        T2RWidget.initialize($table);
        T2R.updateTogglTotals();
        $table.removeClass('t2r-loading');
        if (pendingEntriesExist) {
            if (T2R.getFilterForm().has(':focus').length > 0) {
                $checkAll.focus();
            }
            $checkAll.removeAttr('disabled');
            T2R.unlockPublishForm();
        }
    });
};
T2R.updateTogglReportLink = function (data) {
    data.workspace = data.workspace || T2R.tempStorage.get('default_toggl_workspace', 0);
    var url = T2R_TOGGL_REPORT_URL_FORMAT
        .replace(/\[@date\]/g, data.date)
        .replace('[@workspace]', data.workspace);
    $('#toggl-report-link').attr('href', url);
};
T2R.updateTogglTotals = function () {
    var $table = T2R.getTogglTable();
    var total = new T2RDuration();
    $table.find('tbody tr').each(function (i) {
        var $tr = $(this);
        if ($tr.hasClass('t2r-error')) {
            return;
        }
        if (!$tr.find('.cb-import').is(':checked')) {
            return;
        }
        var hours = $tr.find('[data-property="hours"]').val();
        try {
            var duration = new T2RDuration();
            duration.setHHMM(hours);
            total.add(duration);
        }
        catch (e) {
            console.error(e);
        }
    });
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
};
T2R._getRawRedmineTimeEntries = function (query, callback) {
    query = query || {};
    try {
        T2R.redmineRequest({
            async: true,
            method: 'get',
            url: '/toggl2redmine/redmine/time_entries',
            data: {
                from: query.from,
                till: query.till
            },
            success: function (data, status, xhr) {
                var output = ('undefined' !== typeof data.time_entries)
                    ? data.time_entries : [];
                callback(output);
            }
        });
    }
    catch (e) {
        callback(false);
    }
};
T2R.getRedmineTimeEntries = function (query, callback) {
    query = query || {};
    callback = callback || T2R.FAKE_CALLBACK;
    T2R._getRawRedmineTimeEntries(query, function (entries) {
        var output = [];
        for (var i in entries) {
            var entry = entries[i];
            console.groupCollapsed('Received Redmine entry: ' + entry.id);
            console.debug('Redmine time entry: ', entry);
            entry.issue = entry.issue || { id: false };
            entry.duration = Math.floor(parseFloat(entry.hours) * 3600);
            output.push(entry);
        }
        callback(entries);
    });
};
T2R.updateRedmineReport = function () {
    var $table = T2R.getRedmineTable().addClass('t2r-loading');
    $table.find('tbody').html('');
    var till = T2R.tempStorage.get('date');
    till = T2R.dateStringToObject(till);
    var from = till;
    var opts = {
        from: from.toISOString().split('T')[0] + 'T00:00:00Z',
        till: till.toISOString().split('T')[0] + 'T00:00:00Z'
    };
    T2R.updateRedmineReportLink({
        date: T2R.tempStorage.get('date')
    });
    T2R.getRedmineTimeEntries(opts, function (entries) {
        var $table = T2R.getRedmineTable().addClass('t2r-loading');
        for (var key in entries) {
            var entry = entries[key];
            var markup = T2RRenderer.render('RedmineRow', entry);
            $table.find('tbody').append(markup);
        }
        if (0 === entries.length) {
            var markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + T2R.t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').html(markup);
        }
        T2R.updateRedmineTotals();
        $table.removeClass('t2r-loading');
    });
};
T2R.updateRedmineReportLink = function (data) {
    var url = T2R_REDMINE_REPORT_URL_FORMAT
        .replace('[@date]', data.date);
    $('#redmine-report-link').attr('href', url);
};
T2R.updateRedmineTotals = function () {
    var $table = T2R.getRedmineTable();
    var total = new T2RDuration();
    $table.find('tbody tr .hours').each(function (i) {
        var hours = $(this).text().trim();
        if (hours.length > 0) {
            total.add(hours);
        }
    });
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
};
T2R.updateLastImported = function () {
    var now = T2R.dateFormatYYYYMMDD(new Date());
    T2R.redmineRequest({
        url: '/time_entries.json',
        data: {
            user_id: 'me',
            limit: 1,
            to: now
        },
        beforeSend: function () {
            $(this).html('&nbsp;').addClass('t2r-loading');
        },
        context: $('#last-imported'),
        complete: function (xhr, status) {
            var sDate = 'Unknown';
            try {
                var lastImported = xhr.responseJSON.time_entries.pop().spent_on;
                lastImported = T2R.dateStringToObject(lastImported + ' 00:00:00');
                sDate = lastImported.toLocaleDateString();
            }
            catch (e) { }
            $(this).text(sDate).removeClass('t2r-loading');
        }
    });
};
T2R.getRedmineActivities = function (callback) {
    var key = 'redmine.activities';
    callback = callback || T2R.FAKE_CALLBACK;
    var activities = T2R.cache(key);
    if (activities) {
        callback(activities);
        return;
    }
    T2R.redmineRequest({
        url: '/enumerations/time_entry_activities.json',
        success: function (data, status, xhr) {
            var activities = data.time_entry_activities;
            T2R.cache(key, activities);
            callback(activities);
        },
        error: function (xhr, textStatus) {
            console.error('Could not load Redmine activities.');
            T2R.flash(T2R.t('t2r.error.ajax_load'), 'error');
            callback([]);
        }
    });
};
T2R.getRedmineIssue = function (id) {
    var output = T2R.getRedmineIssues([id]);
    return ('undefined' == typeof output[id]) ? false : output[id];
};
T2R.getRedmineIssues = function (ids) {
    var output = {};
    if (0 === ids.length) {
        return output;
    }
    try {
        T2R.redmineRequest({
            async: false,
            cache: true,
            timeout: 1000,
            url: '/issues.json',
            data: {
                issue_id: ids.join(','),
                status_id: '*'
            },
            success: function (data, status, xhr) {
                var issues = ('undefined' === data.issues) ? [] : data.issues;
                for (var i in issues) {
                    var issue = issues[i];
                    output[issue.id] = issue;
                }
            },
            error: function (xhr, textStatus) { }
        });
    }
    catch (e) {
        console.error(e);
    }
    return output;
};
T2R.getRedmineCsrfToken = function () {
    var key = 'redmine.token';
    var output = T2R.cache(key);
    if (!output) {
        var $param = $('meta[name="csrf-param"]');
        var $token = $('meta[name="csrf-token"]');
        if ($param.length === 1 && $token.length === 1) {
            output = {
                param: $param.attr('content'),
                token: $token.attr('content')
            };
            T2R.cache(key, output);
        }
    }
    return output;
};
T2R.redmineRequest = function (opts) {
    opts.timeout = opts.timeout || 3000;
    if (opts.url.match(/^\//)) {
        opts.url = T2R_REDMINE_URL + opts.url;
    }
    opts.headers = opts.headers || {};
    opts.headers['X-Redmine-API-Key'] = T2R_REDMINE_API_KEY;
    T2RAjaxQueue.addItem(opts);
};
T2R.redmineIssueURL = function (id) {
    id = parseInt(id);
    var output = null;
    if (!isNaN(id) && id > 0) {
        output = T2R_REDMINE_URL + '/issues/' + id;
    }
    return output;
};
var T2RAjaxQueue = T2RAjaxQueue || {};
T2RAjaxQueue.__items = [];
T2RAjaxQueue.__requestInProgress = false;
T2RAjaxQueue.size = function () {
    return T2RAjaxQueue.__items.length;
};
T2RAjaxQueue.isEmpty = function () {
    return T2RAjaxQueue.__items.length === 0;
};
T2RAjaxQueue.addItem = function (opts) {
    T2RAjaxQueue.__items.push(opts);
    T2RAjaxQueue.processItem();
};
T2RAjaxQueue.processItem = function () {
    if (0 === T2RAjaxQueue.__items.length) {
        return;
    }
    if (T2RAjaxQueue.__requestInProgress) {
        return;
    }
    T2RAjaxQueue.__requestInProgress = true;
    console.groupCollapsed('Processing AJAX queue (' + T2RAjaxQueue.size() + ' remaining).');
    var opts = T2RAjaxQueue.__items.shift();
    console.log('Sending item: ', opts);
    var callback = opts.complete || function () { };
    opts.complete = function (xhr, status) {
        var context = this;
        callback.call(context, xhr, status);
        T2RAjaxQueue.__requestInProgress = false;
        T2RAjaxQueue.processItem();
    };
    $.ajax(opts);
    console.groupEnd();
};
var T2RDuration = function (duration = null) {
    this.__hours = 0;
    this.__minutes = 0;
    this.__seconds = 0;
    if (arguments.length > 0) {
        this.setValue(duration);
    }
    return this;
};
T2RDuration.ROUND_UP = 'U';
T2RDuration.ROUND_DOWN = 'D';
T2RDuration.ROUND_REGULAR = 'R';
T2RDuration.prototype.setValue = function (duration) {
    if ('number' === typeof duration) {
        this.setSeconds(duration);
    }
    else if ('string' === typeof duration && duration.match(/^\d+$/)) {
        this.setSeconds(duration);
    }
    else {
        try {
            this.setHHMM(duration);
        }
        catch (e) {
            throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
        }
    }
};
T2RDuration.prototype.setSeconds = function (seconds) {
    seconds += '';
    if (!seconds.match(/^\d+$/)) {
        throw 'Error: ' + seconds + ' is not a valid number.';
    }
    this.__seconds = parseInt(seconds);
    this.__minutes = Math.floor(this.__seconds / 60);
    this.__hours = Math.floor(this.__minutes / 60);
    this.__minutes = this.__minutes % 60;
};
T2RDuration.prototype.getSeconds = function (imprecise) {
    imprecise = imprecise === true;
    var output = this.__seconds;
    if (imprecise) {
        output = output - output % 60;
    }
    return output;
};
T2RDuration.prototype.setHHMM = function (hhmm) {
    var parts = null;
    var pattern = /^(\d{0,2})$/;
    if (hhmm.match(pattern)) {
        var parts = hhmm.match(pattern).slice(-1);
        parts.push('00');
    }
    var pattern = /^(\d{0,2}):(\d{0,2})$/;
    if (hhmm.match(pattern)) {
        parts = hhmm.match(pattern).slice(-2);
        if (parts[1].length < 2) {
            parts = null;
        }
        else if (parts[1] > 59) {
            parts = null;
        }
    }
    var pattern = /^(\d{0,2})\.(\d{0,2})$/;
    if (!parts && hhmm.match(pattern)) {
        parts = hhmm.match(pattern).slice(-2);
        parts[1] = (60 * parts[1]) / Math.pow(10, parts[1].length);
        parts[1] = Math.round(parts[1]);
    }
    if (!parts || parts.length !== 2) {
        throw 'Error: ' + hhmm + ' is not in hh:mm format.';
    }
    parts[0] = (parts[0].length == 0) ? 0 : parseInt(parts[0]);
    parts[1] = (parts[1].length == 0) ? 0 : parseInt(parts[1]);
    if (isNaN(parts[0]) || isNaN(parts[1])) {
        throw 'Error: ' + hhmm + ' is not in hh:mm format.';
    }
    var secs = parts[0] * 60 * 60 + parts[1] * 60;
    this.setSeconds(secs);
};
T2RDuration.prototype.getHours = function (force2) {
    force2 = force2 || false;
    var output = this.__hours;
    if (force2) {
        output = ('00' + output).substr(-2);
    }
    return output;
};
T2RDuration.prototype.getMinutes = function (force2) {
    force2 = force2 || false;
    var output = this.__minutes;
    if (force2) {
        output = ('00' + output).substr(-2);
    }
    return output;
};
T2RDuration.prototype.asHHMM = function () {
    return this.getHours(true) + ':' + this.getMinutes(true);
};
T2RDuration.prototype.asDecimal = function (ignoreSeconds) {
    var output = this.getSeconds(ignoreSeconds) / 3600;
    output = output.toFixed(3);
    output = output.substr(0, output.length - 1);
    return output;
};
T2RDuration.prototype.add = function (duration) {
    var oDuration = ('object' === typeof duration)
        ? duration : new T2RDuration(duration);
    var seconds = this.getSeconds() + oDuration.getSeconds();
    this.setSeconds(seconds);
};
T2RDuration.prototype.sub = function (duration) {
    var oDuration = ('object' === typeof duration)
        ? duration : new T2RDuration(duration);
    var seconds = this.getSeconds() - oDuration.getSeconds();
    seconds = (seconds >= 0) ? seconds : 0;
    this.setSeconds(seconds);
};
T2RDuration.prototype.roundTo = function (minutes, direction) {
    minutes = 'undefined' === typeof minutes ? 0 : minutes;
    minutes = parseInt(minutes);
    minutes = isNaN(minutes) ? 0 : minutes;
    if (0 === minutes) {
        return;
    }
    var seconds = minutes * 60;
    var correction = this.getSeconds(false) % seconds;
    if (correction === 0) {
        return;
    }
    switch (direction) {
        case T2RDuration.ROUND_REGULAR:
            if (correction >= seconds / 2) {
                this.roundTo(minutes, T2RDuration.ROUND_UP);
            }
            else {
                this.roundTo(minutes, T2RDuration.ROUND_DOWN);
            }
            break;
        case T2RDuration.ROUND_UP:
            this.add(seconds - correction);
            break;
        case T2RDuration.ROUND_DOWN:
            this.sub(correction);
            break;
        default:
            throw 'Invalid rounding direction. Please use one of T2RDuration.ROUND_*.';
    }
};
var T2RWidget = {};
T2RWidget.initialize = function (el) {
    el = ('undefined' === typeof el) ? document.body : el;
    $(el).find('[data-t2r-widget]').each(function () {
        var el = this, $el = $(this);
        var widgets = $el.attr('data-t2r-widget').split(' ');
        for (var i in widgets) {
            var widget = widgets[i];
            var widgetFlag = 'T2RWidget' + widget + 'Init';
            if (true !== $el.data(widgetFlag)) {
                var method = 'init' + widget;
                if ('undefined' !== typeof T2RWidget[method]) {
                    T2RWidget[method](el);
                    $el
                        .data(widgetFlag, true)
                        .addClass('t2r-widget-' + widget);
                }
                else {
                    throw 'Error: To initialize "' + widget + '" please define "T2RWidget.' + method;
                }
            }
        }
    });
};
T2RWidget.initTooltip = function (el) {
    $(el).tooltip();
};
T2RWidget.initAjaxDeleteLink = function (el) {
    $(el).click(function (e) {
        var $link = $(this);
        e.preventDefault();
        var message = 'Are you sure?';
        if (!confirm(message)) {
            return false;
        }
        var context = $link.attr('data-t2r-delete-link-context');
        var $context = $link.closest(context);
        var url = $link.attr('href');
        var callback = $link.attr('data-t2r-delete-link-callback');
        if (!url) {
            throw 'T2RDeleteLink: URL must be defined in "href" attribute.';
        }
        if (typeof context === 'undefined') {
            throw 'T2RDeleteLink: Context must be defined in "data-t2r-delete-link-context" attribute.';
        }
        T2R.redmineRequest({
            url: url + '.json',
            async: true,
            data: '{}',
            method: 'DELETE',
            complete: function (xhr, textStatus) {
                if (xhr.status === 200) {
                    if (callback) {
                        eval(callback);
                    }
                }
                else {
                    T2R.flash('Deletion failed.', 'error');
                }
            },
        });
        return false;
    });
};
T2RWidget.initTogglRow = function (el) {
    var $el = $(el);
    $el.find('.cb-import')
        .change(T2R.updateTogglTotals)
        .change(function () {
        var $checkbox = $(this);
        var checked = $checkbox.is(':checked');
        var $tr = $checkbox.closest('tr');
        if (checked) {
            $tr.find(':input').not('.cb-import')
                .removeAttr('disabled')
                .attr('required', 'required');
        }
        else {
            $tr.find(':input').not('.cb-import')
                .removeAttr('required')
                .attr('disabled', 'disabled');
        }
    })
        .trigger('change');
    $el.find(':input').tooltip();
};
T2RWidget.initDurationInput = function (el) {
    var $el = $(el);
    $el
        .bind('input', function () {
        var val = $el.val();
        try {
            new T2RDuration(val);
            el.setCustomValidity('');
        }
        catch (e) {
            el.setCustomValidity(e);
        }
    })
        .bind('input', T2R.updateTogglTotals)
        .bind('keyup', function (e) {
        var $input = $(this);
        try {
            var duration = new T2RDuration();
            duration.setHHMM($input.val());
        }
        catch (e) {
            return;
        }
        var minutes = duration.getMinutes();
        var step = e.shiftKey ? 15 : 5;
        if (e.key === 'ArrowUp') {
            var delta = step - (minutes % step);
            duration.add(delta * 60);
        }
        else if (e.key === 'ArrowDown') {
            var delta = (minutes % step) || step;
            duration.sub(delta * 60);
        }
        else {
            return;
        }
        $(this).val(duration.asHHMM()).trigger('input').select();
    })
        .bind('change', function () {
        var $input = $(this);
        var value = '';
        try {
            var duration = new T2RDuration();
            duration.setHHMM($input.val());
            value = duration.asHHMM();
        }
        catch (e) { }
        $input.val(value);
        T2R.updateTogglTotals();
    });
};
T2RWidget.initRedmineActivityDropdown = function (el) {
    var $el = $(el);
    T2R.getRedmineActivities(function (activities) {
        var placeholder = $el.attr('placeholder') || $el.data('placeholder');
        var options = {};
        for (var i in activities) {
            var activity = activities[i];
            options[activity.id] = activity.name;
        }
        var $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });
        $el.append($select.find('option'));
        var value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
};
T2RWidget.initTogglWorkspaceDropdown = function (el) {
    var $el = $(el);
    T2R.getTogglWorkspaces(function (workspaces) {
        var placeholder = $el.attr('placeholder') || $el.data('placeholder');
        var options = {};
        for (var i in workspaces) {
            var workspace = workspaces[i];
            options[workspace.id] = workspace.name;
        }
        var $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });
        $el.append($select.find('option'));
        var value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
};
T2RWidget.initDurationRoundingDirection = function (el) {
    var $el = $(el);
    var options = {};
    options[T2RDuration.ROUND_REGULAR] = 'Round off';
    options[T2RDuration.ROUND_UP] = 'Round up';
    options[T2RDuration.ROUND_DOWN] = 'Round down';
    var $select = T2RRenderer.render('Dropdown', {
        placeholder: 'Don\'t round',
        options: options
    });
    $el.append($select.find('option'));
};
var T2RRenderer = {};
T2RRenderer.renderDropdown = function (data) {
    var $el = $('<select />');
    if ('undefined' !== typeof data.placeholder) {
        $el.append('<option value="">' + data.placeholder + '</option>');
    }
    if ('undefined' !== typeof data.attributes) {
        $el.attr(data.attributes);
    }
    for (var value in data.options) {
        var label = data.options[value];
        $el.append('<option value="' + value + '">' + label + '</option>');
    }
    return $el;
};
T2RRenderer.renderDuration = function (data) {
    data = Math.ceil(data / 60);
    var h = Math.floor(data / 60);
    var output = h;
    var m = data % 60;
    output += ':' + ('00' + m).substr(-2);
    return output;
};
T2RRenderer.renderRedmineProjectLabel = function (project) {
    project || (project = { name: 'Unknown', path: 'javascript:void(0)', status: 1 });
    project.classes = ['project'];
    if (project.status != 1) {
        project.classes.push('closed');
    }
    return '<a href="' + project.path + '" class="' + project.classes.join(' ') + '"><strong>'
        + T2R.htmlEntityEncode(project.name)
        + '</strong></a>';
};
T2RRenderer.renderRedmineIssueLabel = function (data) {
    var issue = data;
    if (!issue || !issue.id) {
        return false;
    }
    var markup = '<a href="' + T2R.redmineIssueURL(issue.id) + '" target="_blank">'
        + T2R.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + T2R.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + T2R.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
        + '</a>';
    return markup;
};
T2RRenderer.renderTogglRow = function (data) {
    var issue = data.issue || null;
    var project = data.project || null;
    var oDuration = data.duration;
    var rDuration = data.roundedDuration;
    var issueLabel = issue ? T2RRenderer.render('RedmineIssueLabel', issue) : false;
    if (!issueLabel) {
        issueLabel = data.issue_id || '-';
    }
    var markup = '<tr data-t2r-widget="TogglRow">'
        + '<td class="checkbox"><input class="cb-import" type="checkbox" value="1" title="Check this box if you want to import this entry." /></td>'
        + '<td class="status"></td>'
        + '<td class="issue">'
        + '<input data-property="issue_id" type="hidden" data-value="' + T2R.htmlEntityEncode(issue ? issue.id : '') + '" value="' + (issue ? issue.id : '') + '" />'
        + T2RRenderer.render('RedmineProjectLabel', project)
        + '<br />'
        + issueLabel
        + '</td>'
        + '<td class="comments"><input data-property="comments" type="text" value="' + T2R.htmlEntityEncode(data.comments) + '" maxlength="255" /></td>'
        + '<td class="activity">'
        + '<select data-property="activity_id" required="required" placeholder="-" data-t2r-widget="RedmineActivityDropdown" data-selected="' + T2R.localStorage.get('t2r.default-activity') + '"></select>'
        + '</td>'
        + '<td class="hours">'
        + '<input data-property="hours" required="required" data-t2r-widget="DurationInput" type="text" title="Value as on Toggl is ' + oDuration.asHHMM() + '." value="' + rDuration.asHHMM() + '" size="6" maxlength="5" />'
        + '</td>'
        + '</tr>';
    var $tr = $(markup);
    var $checkbox = $tr.find('.cb-import');
    $tr.data('t2r.entry', data);
    switch (data.status) {
        case 'pending':
            if (data.errors.length > 0) {
                $tr.addClass('t2r-error');
                $tr.find(':input').attr({
                    'disabled': 'disabled'
                });
                var $message = T2RRenderer.render('StatusLabel', {
                    label: 'Invalid',
                    description: data.errors.join("\n"),
                    icon: 'error'
                });
                $tr.find('td.status').html($message);
            }
            break;
        case 'imported':
            $checkbox.removeAttr('checked');
            $tr.addClass('t2r-success');
            $tr.find(':input').attr('disabled', 'disabled');
            var $message = T2RRenderer.render('StatusLabel', {
                label: 'Imported',
                description: 'Already imported to Redmine.',
            });
            $tr.find('td.status').html($message);
            break;
        case 'running':
            $tr.addClass('t2r-running');
            $tr.find(':input').attr('disabled', 'disabled');
            var $message = T2RRenderer.render('StatusLabel', {
                label: 'Active',
                description: 'Entry cannot be imported because the timer is still running on Toggl.',
                icon: 'warning'
            });
            $tr.find('td.status').html($message);
            break;
    }
    return $tr;
};
T2RRenderer.renderRedmineRow = function (data) {
    var issue = data.issue.id ? data.issue : null;
    var project = data.project ? data.project : null;
    var issueLabel = issue ? T2RRenderer.render('RedmineIssueLabel', issue) : '-';
    var markup = '<tr id="time-entry-' + data.id + '"  class="time-entry hascontextmenu">'
        + '<td class="subject">'
        + T2RRenderer.render('RedmineProjectLabel', project)
        + '<br />'
        + issueLabel
        + '<input type="checkbox" name="ids[]" value="' + data.id + '" hidden />'
        + '</td>'
        + '<td class="comments">' + T2R.htmlEntityEncode(data.comments) + '</td>'
        + '<td class="activity">' + T2R.htmlEntityEncode(data.activity.name) + '</td>'
        + '<td class="hours">' + T2RRenderer.render('Duration', data.duration) + '</td>'
        + '<td class="buttons">' + T2R.BUTTON_ACTIONS + '</td>'
        + '</tr>';
    var $tr = $(markup);
    if (!issue) {
        $tr.addClass('error');
        $tr.find(':input').attr({
            'disabled': 'disabled'
        });
    }
    T2RWidget.initialize($tr);
    $tr.find('.js-contextmenu').bind('click', contextMenuRightClick);
    return $tr;
};
T2RRenderer.renderStatusLabel = function (data) {
    data = jQuery.extend({
        label: 'Unknown',
        description: '',
        icon: 'checked'
    }, data);
    var $message = $('<span>' + data.label + '</span>')
        .addClass('icon icon-' + data.icon);
    if (data.description) {
        $message.attr('title', data.description);
    }
    return $message.tooltip();
};
T2RRenderer.render = function (template, data) {
    var method = 'render' + template;
    if ('undefined' == typeof T2RRenderer) {
        throw 'Error: To render "' + template + '" please define "T2RRenderer.' + method;
    }
    return T2RRenderer[method](data);
};
$(T2R.initialize);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxlQUFlLEdBQVcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFPdkQsT0FBTyxFQUFFLFlBQVksSUFBSSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLElBQUksbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUs1RixJQUFJLEdBQUcsR0FBUTtJQUNYLFNBQVMsRUFBRSxFQUFFO0lBRWIsWUFBWSxFQUFFLElBQUksZUFBZSxFQUFFO0lBRW5DLFdBQVcsRUFBRSxJQUFJLG1CQUFtQixFQUFFO0NBQ3pDLENBQUM7QUFLRixHQUFHLENBQUMsVUFBVSxHQUFHO0lBQ2IsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3ZCLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN0QixHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDckIsR0FBRyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDekIsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQzFCLENBQUMsQ0FBQztBQWtCRixHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVMsR0FBRyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLElBQUksZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFO1FBQ3JDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQzFDLE9BQU8sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7S0FDckQ7SUFFRCxJQUFJLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQyxLQUFLLElBQUksQ0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsMEJBQTBCLENBQUM7S0FDdkQ7SUFHRCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDO0FBV0YsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBVSxNQUFNO0lBQzdDLE1BQU0sR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDO0lBQ3pCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDMUIsSUFBSSxNQUFNLEVBQUU7UUFDUixNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUM7QUFXRixXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLE1BQU07SUFDL0MsTUFBTSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUM7SUFDekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUM1QixJQUFJLE1BQU0sRUFBRTtRQUNSLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2QztJQUNE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