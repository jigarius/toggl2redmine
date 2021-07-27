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
    const $date = $('#date');
    const sDate = $date.val();
    if (!sDate) {
        $date.focus();
        return false;
    }
    let oDate;
    try {
        oDate = utils.dateStringToObject(sDate + ' 00:00:00');
        $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');
    }
    catch (e) {
        $date.focus();
        return false;
    }
    T2R.tempStorage.set('date', sDate);
    window.location.hash = T2R.tempStorage.get('date');
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
    T2R.redmineService.getTogglTimeEntries(opts, function (entries) {
        var $table = T2R.getTogglTable();
        var pendingEntriesExist = false;
        let roundingValue = T2R.localStorage.get('t2r.rounding-value');
        let roundingMethod = T2R.localStorage.get('t2r.rounding-direction');
        for (const key in entries) {
            const entry = entries[key];
            entry.duration = new duration.Duration(Math.max(0, entry.duration));
            entry.roundedDuration = new duration.Duration(entry.duration.seconds);
            if (roundingMethod !== '' && roundingValue > 0) {
                entry.roundedDuration.roundTo(roundingValue, roundingMethod);
            }
            else {
                entry.roundedDuration.roundTo(1, duration.Rounding.Regular);
            }
            entries[key] = entry;
        }
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'running') {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                delete entries[key];
            }
        }
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length === 0) {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                pendingEntriesExist = true;
            }
        }
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length > 0) {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'imported') {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }
        if (0 === entries.length) {
            const markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
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
    $table.find('tbody tr').each(() => {
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
    T2R.redmineService.getTimeEntries(opts, (entries) => {
        if (entries === null) {
            flash.error('An error has occurred. Please try again after some time.');
            entries = [];
        }
        const $table = T2R.getRedmineTable().addClass('t2r-loading');
        for (const key in entries) {
            const entry = entries[key];
            const markup = T2RRenderer.render('RedmineRow', entry);
            $table.find('tbody').append(markup);
        }
        if (0 === entries.length) {
            const markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
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
    T2R.redmineService.getTimeEntryActivities((activities) => {
        const placeholder = $el.data('placeholder');
        const options = {};
        for (const activity of activities) {
            options[activity.id] = activity.name;
        }
        const $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });
        $el.append($select.find('option'));
        const value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
};
T2RWidget.initTogglWorkspaceDropdown = function (el) {
    const $el = $(el);
    T2R.redmineService.getTogglWorkspaces((workspaces) => {
        if (workspaces.length > 0) {
            T2R.tempStorage.set('default_toggl_workspace', workspaces[0].id);
        }
        const placeholder = $el.attr('placeholder') || $el.data('placeholder');
        const options = {};
        for (const workspace of workspaces) {
            options[workspace.id] = workspace.name;
        }
        const $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });
        $el.append($select.find('option'));
        const value = $el.data('selected');
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
        + '<select data-property="activity_id" required="required" data-placeholder="-" data-t2r-widget="RedmineActivityDropdown" data-selected="' + T2R.localStorage.get('t2r.default-activity') + '"></select>'
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
    const issue = data.issue;
    const project = data.project;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxlQUFlLEdBQVcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFPdkQsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxJQUFJLEdBQUcsR0FBUTtJQUVYLFlBQVksRUFBRSxJQUFJLFlBQVksRUFBRTtJQUVoQyxXQUFXLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRTtJQUVuQyxZQUFZLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRTtJQUVwQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUM7Q0FDMUQsQ0FBQTtBQVFELEdBQUcsQ0FBQyxhQUFhLEdBQUc7SUFDaEIsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFBO0FBUUQsR0FBRyxDQUFDLGNBQWMsR0FBRztJQUNqQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUE7QUFRRCxHQUFHLENBQUMsYUFBYSxHQUFHO0lBQ2hCLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQTtBQVFELEdBQUcsQ0FBQyxlQUFlLEdBQUc7SUFDbEIsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNo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