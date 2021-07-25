const T2R_REDMINE_URL = window.location.origin;
import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
let T2R = {
    localStorage: new LocalStorage(),
    tempStorage: new TemporaryStorage(),
    cacheStorage: new TemporaryStorage()
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
        date: utils.getDateFromLocationHash()
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
    let roundingValue = $('input#rounding-value').val();
    roundingValue = roundingValue ? parseInt(roundingValue) : 0;
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
    T2R.localStorage.set('t2r.rounding-value', roundingValue);
    let roundingMethod = $('select#rounding-direction').val();
    T2R.localStorage.set('t2r.rounding-direction', roundingMethod);
    var $date = $('#date');
    var sDate = $date.val();
    try {
        if (!sDate) {
            throw 'Invalid date.';
        }
        var oDate = utils.dateStringToObject(sDate + ' 00:00:00');
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
T2R.publishToRedmine = function () {
    T2R.lockPublishForm();
    flash.clear();
    var $checkboxes = $('#toggl-report tbody tr input.cb-import');
    if ($checkboxes.filter(':checked').length <= 0) {
        flash.error('Please select the entries which you want to import to Redmine.');
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
        var dur = new duration.Duration();
        try {
            dur.setHHMM(durationInput);
            redmine_entry.hours = dur.asDecimal();
        }
        catch (e) {
            console.warn('Invalid duration. Ignoring entry.', redmine_entry);
            return;
        }
        if (dur.seconds < 30) {
            console.warn('Entry ignored: Duration is less than 30 seconds.', redmine_entry);
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
    callback = callback || utils.noopCallback;
    var workspaces = T2R.cacheStorage.get(key);
    if (workspaces) {
        callback(workspaces);
        return;
    }
    T2R.redmineRequest({
        url: '/toggl2redmine/toggl/workspaces',
        success: function (data, status, xhr) {
            workspaces = data;
            T2R.cacheStorage.set(key, workspaces);
            if (workspaces.length > 0) {
                T2R.tempStorage.set('default_toggl_workspace', workspaces[0].id);
            }
            callback(workspaces);
        },
        error: function (xhr, textStatus) {
            console.error('Could not load Toggl workspaces.');
            flash.error(t('t2r.error.ajax_load'));
            callback([]);
        }
    });
};
T2R._getRawTogglTimeEntries = function (opts, callback) {
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
    callback = callback || utils.noopCallback;
    T2R._getRawTogglTimeEntries(opts, function (entries) {
        var output = [];
        let roundingValue = T2R.localStorage.get('t2r.rounding-value');
        let roundingMethod = T2R.localStorage.get('t2r.rounding-direction');
        for (var key in entries) {
            var entry = entries[key];
            console.groupCollapsed('Received Toggl entry: ' + key);
            console.debug('Toggl time entry: ', entry);
            entry.errors = entry.errors || [];
            entry.duration = new duration.Duration(Math.max(0, entry.duration));
            entry.roundedDuration = new duration.Duration(entry.duration.seconds);
            if (roundingMethod !== '' && roundingValue > 0) {
                entry.roundedDuration.roundTo(roundingValue, roundingMethod);
            }
            else {
                entry.roundedDuration.roundTo(1, duration.Rounding.Regular);
            }
            if (entry.duration.seconds !== entry.roundedDuration.seconds) {
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
                + t('t2r.error.list_empty')
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
    var total = new duration.Duration();
    $table.find('tbody tr').each(function (i) {
        var $tr = $(this);
        if ($tr.hasClass('t2r-error')) {
            return;
        }
        if (!$tr.find('.cb-import').is(':checked')) {
            return;
        }
        let hours = $tr.find('[data-property="hours"]').val();
        try {
            let dur = new duration.Duration();
            dur.setHHMM(hours);
            total.add(dur);
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
    callback = callback || utils.noopCallback;
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
    till = utils.dateStringToObject(till);
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
                + t('t2r.error.list_empty')
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
    var total = new duration.Duration();
    $table.find('tbody tr .hours').each(function (i) {
        let hours = $(this).text().trim();
        if (hours.length > 0) {
            total.add(new duration.Duration(hours));
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
                lastImported = utils.dateStringToObject(lastImported + ' 00:00:00');
                sDate = lastImported.toLocaleDateString();
            }
            catch (e) { }
            $(this).text(sDate).removeClass('t2r-loading');
        }
    });
};
T2R.getRedmineActivities = function (callback) {
    var key = 'redmine.activities';
    callback = callback || utils.noopCallback;
    var activities = T2R.cacheStorage.get(key);
    if (activities) {
        callback(activities);
        return;
    }
    T2R.redmineRequest({
        url: '/enumerations/time_entry_activities.json',
        success: function (data, status, xhr) {
            var activities = data.time_entry_activities;
            T2R.cacheStorage.set(key, activities);
            callback(activities);
        },
        error: function (xhr, textStatus) {
            console.error('Could not load Redmine activities.');
            flash.error(t('t2r.error.ajax_load'));
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
    var output = T2R.cacheStorage.get(key);
    if (!output) {
        var $param = $('meta[name="csrf-param"]');
        var $token = $('meta[name="csrf-token"]');
        if ($param.length === 1 && $token.length === 1) {
            output = {
                param: $param.attr('content'),
                token: $token.attr('content')
            };
            T2R.cacheStorage.set(key, output);
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
let T2RWidget = {};
T2RWidget.initialize = function (el = document.body) {
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
                    flash.error('Deletion failed.');
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
            new duration.Duration(val);
            el.setCustomValidity('');
        }
        catch (e) {
            el.setCustomValidity(e);
        }
    })
        .bind('input', T2R.updateTogglTotals)
        .bind('keyup', function (e) {
        let $input = $(this);
        let dur = new duration.Duration();
        try {
            dur.setHHMM($input.val());
        }
        catch (e) {
            return;
        }
        var minutes = dur.minutes % 60;
        var step = e.shiftKey ? 15 : 5;
        let delta = 0;
        if (e.key === 'ArrowUp') {
            delta = step - (minutes % step);
            dur.add(new duration.Duration(delta * 60));
        }
        else if (e.key === 'ArrowDown') {
            delta = (minutes % step) || step;
            dur.sub(new duration.Duration(delta * 60));
        }
        else {
            return;
        }
        $(this).val(dur.asHHMM()).trigger('input').select();
    })
        .bind('change', function () {
        let $input = $(this);
        let value = '';
        try {
            let dur = new duration.Duration();
            dur.setHHMM($input.val());
            value = dur.asHHMM();
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
    let $el = $(el);
    let options = {};
    options[duration.Rounding.Regular] = 'Round off';
    options[duration.Rounding.Up] = 'Round up';
    options[duration.Rounding.Down] = 'Round down';
    var $select = T2RRenderer.render('Dropdown', {
        placeholder: 'Don\'t round',
        options: options
    });
    $el.append($select.find('option'));
};
let T2RRenderer = {};
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
        + utils.htmlEntityEncode(project.name)
        + '</strong></a>';
};
T2RRenderer.renderRedmineIssueLabel = function (data) {
    var issue = data;
    if (!issue || !issue.id) {
        return false;
    }
    var markup = '<a href="' + T2R.redmineIssueURL(issue.id) + '" target="_blank">'
        + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
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
        + '<input data-property="issue_id" type="hidden" data-value="' + utils.htmlEntityEncode(issue ? issue.id : '') + '" value="' + (issue ? issue.id : '') + '" />'
        + T2RRenderer.render('RedmineProjectLabel', project)
        + '<br />'
        + issueLabel
        + '</td>'
        + '<td class="comments"><input data-property="comments" type="text" value="' + utils.htmlEntityEncode(data.comments) + '" maxlength="255" /></td>'
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
        + '<td class="comments">' + utils.htmlEntityEncode(data.comments) + '</td>'
        + '<td class="activity">' + utils.htmlEntityEncode(data.activity.name) + '</td>'
        + '<td class="hours">' + T2RRenderer.render('Duration', data.duration) + '</td>'
        + '<td class="buttons">' + T2R_BUTTON_ACTIONS + '</td>'
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
    const method = 'render' + template;
    if (typeof T2RRenderer[method] === 'undefined') {
        throw `To render "${template}", define T2RRenderer.${method}`;
    }
    return T2RRenderer[method](data);
};
$(() => {
    T2RWidget.initialize();
    T2R.initTogglReport();
    T2R.initFilterForm();
    T2R.updateLastImported();
    T2R.initPublishForm();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxlQUFlLEdBQVcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFPdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2xFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sS0FBSyxRQUFRLE1BQU0sbUJBQW1CLENBQUM7QUFDOUMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QyxPQUFPLEtBQUssS0FBSyxNQUFNLGdCQUFnQixDQUFBO0FBS3ZDLElBQUksR0FBRyxHQUFRO0lBRVgsWUFBWSxFQUFFLElBQUksWUFBWSxFQUFFO0lBRWhDLFdBQVcsRUFBRSxJQUFJLGdCQUFnQixFQUFFO0lBRW5DLFlBQVksRUFBRSxJQUFJLGdCQUFnQixFQUFFO0NBQ3ZDLENBQUM7QUFRRixHQUFHLENBQUMsYUFBYSxHQUFHO0lBQ2hCLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQztBQVFGLEdBQUcsQ0FBQyxjQUFjLEdBQUc7SUFDakIsT0FBTyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBUUYsR0FBRyxDQUFDLGFBQWEsR0FBRztJQUNoQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFRRixHQUFHLENBQUMsZUFBZSxHQUFHO0lBQ2xCLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDO0FBS0YsR0FBRyxDQUFDLGVBQWUsR0FBRztJQUVsQixHQUFHLENBQUMsYUFBYSxFQUFFO1NBQ2QsSUFBSSxDQUFDLGlCQUFpQixD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