import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineService } from "./t2r/services.js";
import { Widget } from "./t2r/widgets.js";
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
        Widget.initialize($table);
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
const T2RRenderer = {};
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
    const issueLabel = T2RRenderer.renderRedmineIssueLabel(issue || { id: data.id });
    const project = data.project || null;
    const projectLabel = T2RRenderer.renderRedmineProjectLabel(project);
    const oDuration = data.duration;
    const rDuration = data.roundedDuration;
    const markup = '<tr data-t2r-widget="TogglRow">'
        + '<td class="checkbox"><input class="cb-import" type="checkbox" value="1" title="Check this box if you want to import this entry." /></td>'
        + '<td class="status"></td>'
        + '<td class="issue">'
        + '<input data-property="issue_id" type="hidden" data-value="' + utils.htmlEntityEncode(issue ? issue.id : '') + '" value="' + (issue ? issue.id : '') + '" />'
        + projectLabel + '<br />' + issueLabel
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
    $tr.find('input[data-property=hours]')
        .on('input', T2R.updateTogglTotals)
        .on('change', T2R.updateTogglTotals);
    $tr.find('.cb-import')
        .on('change', T2R.updateTogglTotals);
    return $tr;
};
T2RRenderer.renderRedmineRow = function (data) {
    const issue = data.issue;
    const issueLabel = T2RRenderer.renderRedmineIssueLabel(issue);
    const project = data.project;
    const projectLabel = T2RRenderer.renderRedmineProjectLabel(project);
    const dur = new duration.Duration(data.duration);
    dur.roundTo(1, duration.Rounding.Up);
    var markup = '<tr id="time-entry-' + data.id + '"  class="time-entry hascontextmenu">'
        + '<td class="subject">'
        + projectLabel + '<br />' + issueLabel
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
    Widget.initialize($tr);
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
    Widget.initialize();
    T2R.initTogglReport();
    T2R.initFilterForm();
    T2R.updateLastImportDate();
    T2R.initPublishForm();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUEsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDeEMsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQkFBbUIsQ0FBQztBQUM5QyxPQUFPLEtBQUssS0FBSyxNQUFNLGdCQUFnQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFLdkMsTUFBTSxHQUFHLEdBQVE7SUFFYixZQUFZLEVBQUUsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDO0lBRXRDLFdBQVcsRUFBRSxJQUFJLGdCQUFnQixFQUFFO0lBRW5DLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQztDQUMxRCxDQUFBO0FBUUQsR0FBRyxDQUFDLGFBQWEsR0FBRztJQUNoQixPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUE7QUFRRCxHQUFHLENBQUMsY0FBYyxHQUFHO0lBQ2pCLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQTtBQVFELEdBQUcsQ0FBQyxhQUFhLEdBQUc7SUFDaEIsT0FBTyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFBO0FBUUQsR0FBRyxDQUFDLGVBQWUsR0FBRztJQUNsQixPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQTtBQUtELEdBQUcsQ0FBQyxlQUFl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