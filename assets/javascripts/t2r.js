import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineService } from "./t2r/services.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
const T2R = {
    localStorage: new LocalStorage('t2r.'),
    tempStorage: new TemporaryStorage(),
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
        'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
        'default-activity': T2R.localStorage.get('default-activity'),
        'rounding-value': T2R.localStorage.get('rounding-value'),
        'rounding-direction': T2R.localStorage.get('rounding-direction')
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
    T2R.localStorage.set('default-activity', defaultActivity);
    var $togglWorkspace = $('select#toggl-workspace');
    var togglWorkspace = $togglWorkspace.val();
    if (null === togglWorkspace) {
        togglWorkspace = $togglWorkspace.data('selected');
    }
    T2R.localStorage.set('toggl-workspace', togglWorkspace);
    let roundingValue = $('input#rounding-value').val();
    roundingValue = roundingValue ? parseInt(roundingValue) : 0;
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
    T2R.localStorage.set('rounding-value', roundingValue);
    const roundingMethod = $('select#rounding-direction').val();
    T2R.localStorage.set('rounding-direction', roundingMethod);
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
        'default-activity': T2R.localStorage.get('default-activity'),
        'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
        'rounding-value': T2R.localStorage.get('rounding-value'),
        'rounding-direction': T2R.localStorage.get('rounding-direction')
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
    const date = T2R.tempStorage.get('date');
    const query = {
        from: date + ' 00:00:00',
        till: date + ' 23:59:59',
        workspace: T2R.localStorage.get('toggl-workspace')
    };
    T2R.updateTogglReportLink({
        date: date,
        workspace: query.workspace
    });
    T2R.lockPublishForm();
    const $checkAll = $table.find('.check-all')
        .prop('checked', false)
        .attr('disabled', 'disabled');
    T2R.redmineService.getTogglTimeEntries(query, function (entries) {
        var $table = T2R.getTogglTable();
        var pendingEntriesExist = false;
        const roundingValue = T2R.localStorage.get('rounding-value');
        const roundingMethod = T2R.localStorage.get('rounding-direction');
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
    $table.find('tbody tr').each(function () {
        const $tr = $(this);
        const dur = new duration.Duration();
        if ($tr.hasClass('t2r-error')) {
            return;
        }
        if (!$tr.find('.cb-import').is(':checked')) {
            return;
        }
        const hours = $tr.find('[data-property="hours"]').val();
        try {
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
    const query = {
        from: from.toISOString().split('T')[0] + 'T00:00:00Z',
        till: till.toISOString().split('T')[0] + 'T00:00:00Z'
    };
    T2R.updateRedmineReportLink({
        date: T2R.tempStorage.get('date')
    });
    T2R.redmineService.getTimeEntries(query, (entries) => {
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
    const $table = T2R.getRedmineTable();
    const total = new duration.Duration();
    $table.find('tbody tr .hours').each(function (i) {
        const hours = $(this).text().trim();
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
const T2RWidget = {};
T2RWidget.initialize = function (el = document.body) {
    $(el).find('[data-t2r-widget]').each(function () {
        const $el = $(this);
        const widgets = $el.attr('data-t2r-widget').split(' ');
        for (const widget of widgets) {
            const flag = 'T2RWidget' + widget + 'Init';
            if (true === $el.data(flag)) {
                continue;
            }
            const method = 'init' + widget;
            if ('undefined' !== typeof T2RWidget[method]) {
                T2RWidget[method](this);
                $el.data(flag, true).addClass(`t2r-widget-${widget}`);
            }
            else {
                throw 'Error: To initialize "' + widget + '" please define "T2RWidget.' + method;
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
        const $input = $(this);
        const dur = new duration.Duration();
        try {
            dur.setHHMM($input.val());
        }
        catch (e) {
            return;
        }
        const mm = dur.minutes % 60;
        const step = e.shiftKey ? 15 : 5;
        let delta = 0;
        if (e.key === 'ArrowUp') {
            delta = step - (mm % step);
            dur.add(new duration.Duration(delta * 60));
        }
        else if (e.key === 'ArrowDown') {
            delta = (mm % step) || step;
            dur.sub(new duration.Duration(delta * 60));
        }
        else {
            return;
        }
        $(this).val(dur.asHHMM()).trigger('input').select();
    })
        .bind('change', function () {
        const $input = $(this);
        const value = $input.val();
        const dur = new duration.Duration();
        try {
            dur.setHHMM(value);
        }
        catch (e) {
            console.debug(`Could not understand time: ${value}`);
        }
        $input.val(dur.asHHMM());
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
    const $el = $(el);
    const options = {};
    options[duration.Rounding.Regular] = 'Round off';
    options[duration.Rounding.Up] = 'Round up';
    options[duration.Rounding.Down] = 'Round down';
    const $select = T2RRenderer.render('Dropdown', {
        placeholder: 'Don\'t round',
        options: options
    });
    $el.append($select.find('option'));
};
const T2RRenderer = {};
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
T2RRenderer.renderRedmineIssueLabel = function (issue) {
    if (typeof issue['id'] == 'undefined' || !issue.id)
        return '-';
    if (!issue.path)
        return issue.id.toString();
    return '<a href="' + issue.path + '" target="_blank">'
        + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
        + '</a>';
};
T2RRenderer.renderTogglRow = function (data) {
    const issue = data.issue || null;
    const project = data.project || null;
    const oDuration = data.duration;
    const rDuration = data.roundedDuration;
    const issueLabel = T2RRenderer.render('RedmineIssueLabel', issue || { id: data.id });
    const markup = '<tr data-t2r-widget="TogglRow">'
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
        + '<select data-property="activity_id" required="required" data-placeholder="-" data-t2r-widget="RedmineActivityDropdown" data-selected="' + T2R.localStorage.get('default-activity') + '"></select>'
        + '</td>'
        + '<td class="hours">'
        + '<input data-property="hours" required="required" data-t2r-widget="DurationInput" type="text" title="Value as on Toggl is ' + oDuration.asHHMM() + '." value="' + rDuration.asHHMM() + '" size="6" maxlength="5" />'
        + '</td>'
        + '</tr>';
    const $tr = $(markup);
    $tr.data('t2r.entry', data);
    const $checkbox = $tr.find('.cb-import');
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
    const dur = new duration.Duration(data.duration);
    dur.roundTo(1, duration.Rounding.Up);
    const issueLabel = T2RRenderer.render('RedmineIssueLabel', issue);
    var markup = '<tr id="time-entry-' + data.id + '"  class="time-entry hascontextmenu">'
        + '<td class="subject">'
        + T2RRenderer.render('RedmineProjectLabel', project)
        + '<br />'
        + issueLabel
        + '<input type="checkbox" name="ids[]" value="' + data.id + '" hidden />'
        + '</td>'
        + '<td class="comments">' + utils.htmlEntityEncode(data.comments) + '</td>'
        + '<td class="activity">' + utils.htmlEntityEncode(data.activity.name) + '</td>'
        + '<td class="hours">' + dur.asHHMM() + '</td>'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUEsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLEdBQUcsR0FBUTtJQUViLFlBQVksRUFBRSxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUM7SUFFdEMsV0FBVyxFQUFFLElBQUksZ0JBQWdCLEVBQUU7SUFFbkMsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLG1CQUFtQixDQUFDO0NBQzFELENBQUE7QUFRRCxHQUFHLENBQUMsYUFBYSxHQUFHO0lBQ2hCLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQTtBQVFELEdBQUcsQ0FBQyxjQUFjLEdBQUc7SUFDakIsT0FBTyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFBO0FBUUQsR0FBRyxDQUFDLGFBQWEsR0FBRztJQUNoQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUE7QUFRRCxHQUFHLENBQUMsZUFBZSxHQUFHO0lBQ2xCLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFBO0FBS0QsR0FBRyxDQUFDLGVBQWUsR0FBRztJQUVsQixHQUFHLENBQUMsYUFBYSxFQUFFO1NBQ2QsSUFBSSxD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