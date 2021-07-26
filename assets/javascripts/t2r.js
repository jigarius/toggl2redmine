const T2R_REDMINE_URL = window.location.origin;
import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineService } from "./t2r/services.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
let T2R = {
    localStorage: new LocalStorage(),
    tempStorage: new TemporaryStorage(),
    cacheStorage: new TemporaryStorage(),
    redmineService: new RedmineService(T2R_REDMINE_API_KEY)
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
        date: utils.dateFormatYYYYMMDD(new Date()),
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
        T2R.redmineService.request({
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
        if (T2R.redmineService.requestQueue.length === 0) {
            clearInterval(T2R.__publishWatcher);
            T2R.unlockPublishForm();
            T2R.updateRedmineReport();
            T2R.updateLastImported();
        }
    }, 250);
};
T2R.getTogglWorkspaces = function (callback) {
    let workspaces = T2R.cacheStorage.get('toggl.workspaces');
    if (workspaces) {
        callback(workspaces);
        return;
    }
    T2R.redmineService.getTogglWorkspaces((workspaces) => {
        if (workspaces === null) {
            flash.error(t('t2r.error.ajax_load'));
            callback([]);
            return;
        }
        if (workspaces.length > 0) {
            T2R.tempStorage.set('default_toggl_workspace', workspaces[0].id);
        }
        T2R.cacheStorage.set('toggl.workspaces', workspaces);
        callback(workspaces);
    });
};
T2R.getTogglTimeEntries = function (opts, callback) {
    opts = opts || {};
    callback = callback || utils.noopCallback;
    T2R.redmineService.getTogglTimeEntries(opts, function (entries) {
        var output = [];
        let roundingValue = T2R.localStorage.get('t2r.rounding-value');
        let roundingMethod = T2R.localStorage.get('t2r.rounding-direction');
        for (var key in entries) {
            var entry = entries[key];
            console.groupCollapsed('Received Toggl entry: ' + key);
            console.log('Toggl time entry: ', entry);
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
T2R.getRedmineTimeEntries = function (query, callback) {
    query = query || {};
    callback = callback || utils.noopCallback;
    T2R.redmineService.getRedmineTimeEntries(query, function (entries) {
        var output = [];
        for (var i in entries) {
            var entry = entries[i];
            console.groupCollapsed('Received Redmine entry: ' + entry.id);
            console.log('Redmine time entry: ', entry);
            console.groupEnd();
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
T2R.updateLastImportDate = function () {
    const $context = $('#last-imported');
    T2R.redmineService.getLastImportDate((lastImportDate) => {
        const sDate = lastImportDate ? lastImportDate.toLocaleDateString() : 'Unknown';
        console.debug(`Last import date: ${sDate}`);
        $context.text(sDate).removeClass('t2r-loading');
    }, {
        beforeSend: function () {
            $context.html('&nbsp;').addClass('t2r-loading');
        },
    });
};
T2R.getTimeEntryActivities = function (callback) {
    var key = 'redmine.activities';
    callback = callback || utils.noopCallback;
    let activities = T2R.cacheStorage.get(key);
    if (activities) {
        callback(activities);
        return;
    }
    T2R.redmineService.getTimeEntryActivities((activities) => {
        if (activities === null) {
            flash.error(t('t2r.error.ajax_load'));
            return;
        }
        T2R.cacheStorage.set(key, activities);
        callback(activities);
    });
};
T2R.redmineIssueURL = function (id) {
    id = parseInt(id);
    var output = null;
    if (!isNaN(id) && id > 0) {
        output = T2R_REDMINE_URL + '/issues/' + id;
    }
    return output;
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
        T2R.redmineService.request({
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
    T2R.getTimeEntryActivities(function (activities) {
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
    T2R.getTogglWorkspaces((workspaces) => {
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
    T2R.updateLastImportDate();
    T2R.initPublishForm();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxlQUFlLEdBQVcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFPdkQsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxJQUFJLEdBQUcsR0FBUTtJQUVYLFlBQVksRUFBRSxJQUFJLFlBQVksRUFBRTtJQUVoQyxXQUFXLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRTtJQUVuQyxZQUFZLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRTtJQUVwQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUM7Q0FDMUQsQ0FBQztBQVFGLEdBQUcsQ0FBQyxhQUFhLEdBQUc7SUFDaEIsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDO0FBUUYsR0FBRyxDQUFDLGNBQWMsR0FBRztJQUNqQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFRRixHQUFHLENBQUMsYUFBYSxHQUFHO0lBQ2hCLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQVFGLEdBQUcsQ0FBQyxlQUFlLEdBQUc7SUFDbEIsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNo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