const T2R_REDMINE_URL = window.location.origin;
import { LocalStorage as T2RLocalStorage } from "./t2r/storage/LocalStorage.js";
import { TemporaryStorage as T2RTemporaryStorage } from "./t2r/storage/TemporaryStorage.js";
let T2R = {
    cacheData: {},
    appData: {},
    togglDefaultWorkspace: 0,
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
                T2R.togglDefaultWorkspace = workspaces[0].id;
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
    data.workspace = data.workspace || T2R.togglDefaultWorkspace;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxlQUFlLEdBQVcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFPdkQsT0FBTyxFQUFFLFlBQVksSUFBSSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLElBQUksbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUs1RixJQUFJLEdBQUcsR0FBUTtJQUNYLFNBQVMsRUFBRSxFQUFFO0lBQ2IsT0FBTyxFQUFFLEVBQUU7SUFHWCxxQkFBcUIsRUFBRSxDQUFDO0lBRXhCLFlBQVksRUFBRSxJQUFJLGVBQWUsRUFBRTtJQUVuQyxXQUFXLEVBQUUsSUFBSSxtQkFBbUIsRUFBRTtDQUN6QyxDQUFDO0FBS0YsR0FBRyxDQUFDLFVBQVUsR0FBRztJQUNiLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN2QixHQUFHLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDdEIsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JCLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQ3pCLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUMxQixDQUFDLENBQUM7QUFrQkYsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFTLEdBQUcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUNyQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQztRQUMxQyxPQUFPLHVCQUF1QixHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0tBQ3JEO0lBRUQsSUFBSSxNQUFNLEdBQUcsZ0JB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