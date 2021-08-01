// @ts-nocheck

declare const T2R_REDMINE_API_KEY: string;
declare const T2R_REDMINE_REPORT_URL_FORMAT : string;
declare const T2R_TOGGL_REPORT_URL_FORMAT: string;
declare const T2R_BUTTON_ACTIONS: string;
declare const contextMenuRightClick: any;

import {LocalStorage, TemporaryStorage} from "./t2r/storage.js";
import {translate as t} from "./t2r/i18n.js";
import {RedmineService} from "./t2r/services.js";
import {Widget} from "./t2r/widgets.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js"
import * as flash from "./t2r/flash.js"

/**
 * Toggl 2 Redmine Helper.
 */
const T2R: any = {
    // Browser storage.
    localStorage: new LocalStorage('t2r.'),
    // Temporary storage.
    tempStorage: new TemporaryStorage(),
    // Redmine service.
    redmineService: new RedmineService(T2R_REDMINE_API_KEY)
}

/**
 * Returns the form containing filters.
 *
 * @return {Object}
 *   jQuery object for the filter form.
 */
T2R.getFilterForm = function () {
    return $('#filter-form');
}

/**
 * Returns the form to publish data to Redmine.
 *
 * @return {Object}
 *   jQuery object for the publish form.
 */
T2R.getPublishForm = function () {
    return $('#publish-form');
}

/**
 * Returns the Toggl report table.
 *
 * @return {Object}
 *   jQuery object for the Toggl report table.
 */
T2R.getTogglTable = function () {
    return $('#toggl-report');
}

/**
 * Returns the Redmine report table.
 *
 * @return {Object}
 *   jQuery object for the Redmine report table.
 */
T2R.getRedmineTable = function () {
    return $('#redmine-report');
}

/**
 * Initializes the Toggl report.
 */
T2R.initTogglReport = function () {
    // Initialize the check-all heading.
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
}

/**
 * Filter form initializer.
 */
T2R.initFilterForm = function () {
    var $form = T2R.getFilterForm();

    // Initialize apply filters button.
    $form.find('#btn-apply-filters').click(function () {
        T2R.handleFilterForm();
        return false;
    });

    // Initialize reset filters button.
    $form.find('#btn-reset-filters').click(function () {
        T2R.resetFilterForm();
        return false;
    });

    // Initialize tooltips for form fields.
    $form.find('[title]').tooltip();

    // Handle filter form submission.
    $form.submit(function (e) {
        e.preventDefault();
        T2R.handleFilterForm();
    });

    // Reset the form to set default values.
    var data = {
        date: utils.getDateFromLocationHash()
    };
    T2R.resetFilterForm(data);
}

/**
 * Filter form resetter.
 *
 * @param {object} data
 *   Default values to populate.
 */
T2R.resetFilterForm = function (data) {
    data = data || {};

    // Default values.
    var defaults = {
        date: utils.dateFormatYYYYMMDD(new Date()),
        'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
        'default-activity': T2R.localStorage.get('default-activity'),
        'rounding-value': T2R.localStorage.get('rounding-value'),
        'rounding-direction': T2R.localStorage.get('rounding-direction')
    };

    // Merge with defaults.
    for (var name in defaults) {
        var value = data[name];
        if ('undefined' == typeof value || '' === value || false === value) {
            data[name] = defaults[name];
        }
    }

    // Initialize all form inputs.
    T2R.getFilterForm().find(':input')
        .each(function () {
            var $field = $(this).val('');
            var name = $field.attr('name');
            // Populate default value, if set.
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

    // Submit the filter form to update the reports.
    T2R.handleFilterForm();
}

/**
 * Filter form submission handler.
 */
T2R.handleFilterForm = function() {
    // Determine default activity.
    var $defaultActivity = $('select#default-activity');
    var defaultActivity = $defaultActivity.val();
    if (null === defaultActivity) {
        defaultActivity = $defaultActivity.data('selected');
    }
    T2R.localStorage.set('default-activity', defaultActivity);

    // Determine toggl workspace.
    var $togglWorkspace = $('select#toggl-workspace');
    var togglWorkspace = $togglWorkspace.val();
    if (null === togglWorkspace) {
        togglWorkspace = $togglWorkspace.data('selected');
    }
    T2R.localStorage.set('toggl-workspace', togglWorkspace);

    // Determine rounding value.
    let roundingValue = $('input#rounding-value').val();
    roundingValue = roundingValue ? parseInt(roundingValue as string) : 0;
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
    T2R.localStorage.set('rounding-value', roundingValue);

    // Determine rounding direction.
    const roundingMethod = $('select#rounding-direction').val();
    T2R.localStorage.set('rounding-direction', roundingMethod);

    // Determine date filter.
    const $date = $('#date')
    const sDate = $date.val()
    if (!sDate) {
        $date.focus()
        return false
    }

    let oDate: Date
    try {
        oDate = utils.dateStringToObject(sDate + ' 00:00:00')!
        // Show date in the headings.
        $('h2 .date').html('(' + oDate!.toLocaleDateString() + ')')
    } catch (e) {
        $date.focus()
        return false
    }

    // Store date and update URL hash.
    T2R.tempStorage.set('date', sDate)
    window.location.hash = T2R.tempStorage.get('date')

    // Log the event.
    console.info('Filter form updated: ', {
        'date': T2R.tempStorage.get('date'),
        'default-activity': T2R.localStorage.get('default-activity'),
        'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
        'rounding-value': T2R.localStorage.get('rounding-value'),
        'rounding-direction': T2R.localStorage.get('rounding-direction')
    });

    // Update both the Redmine and Toggl reports.
    setTimeout(function() {
        T2R.updateRedmineReport();
        T2R.updateTogglReport();
    }, 250);

    // Unlock the publish form if it was previously locked.
    T2R.unlockPublishForm();
}

/**
 * Publish form initializer.
 */
T2R.initPublishForm = function () {
    T2R.getPublishForm().submit(T2R.handlePublishForm);
}

/**
 * Locks the publish form.
 *
 * This disallows the user to submit the form.
 */
T2R.lockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').attr('disabled', 'disabled');
}

/**
 * Unlocks the publish form.
 *
 * This allows the user to submit it.
 */
T2R.unlockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').removeAttr('disabled');
}

/**
 * Publish form submission handler.
 */
T2R.handlePublishForm = function() {
    if (confirm('This action cannot be undone. Do you really want to continue?')) {
        setTimeout(T2R.publishToRedmine);
    }
    return false;
}

/**
 * Publishes selected Toggl data to Redmine.
 */
T2R.publishToRedmine = function () {
    T2R.lockPublishForm();
    flash.clear();

    // Check for eligible entries.
    var $checkboxes = $('#toggl-report tbody tr input.cb-import');
    if ($checkboxes.filter(':checked').length <= 0) {
        flash.error('Please select the entries which you want to import to Redmine.');
        T2R.unlockPublishForm();
        return;
    }

    // Post eligible entries to Redmine.
    console.info('Pushing time entries to Redmine.');
    $('#toggl-report tbody tr').each(function () {
        var $tr = $(this);
        var toggl_entry = $tr.data('t2r.entry');
        var $checkbox = $tr.find('input.cb-import');

        // If the item is not marked for import, ignore it.
        if (!$checkbox.prop('checked')) {
            return;
        }

        // Prepare the data to be pushed to Redmine.
        var redmine_entry = {
            spent_on: T2R.tempStorage.get('date'),
            issue_id: parseInt($tr.find('[data-property="issue_id"]').val()),
            comments: $tr.find('[data-property="comments"]').val(),
            activity_id: parseInt($tr.find('[data-property="activity_id"]').val()),
        };

        // Convert time to Redmine-friendly format, i.e. hh:mm.
        var durationInput = $tr.find('[data-property="hours"]').val();
        var dur = new duration.Duration();
        try {
            dur.setHHMM(durationInput);
            redmine_entry.hours = dur.asDecimal();
        } catch (e) {
            console.warn('Invalid duration. Ignoring entry.', redmine_entry);
            return;
        }

        // Ignore entries with 0 duration.
        if (dur.seconds < 30) {
            console.warn('Entry ignored: Duration is less than 30 seconds.', redmine_entry);
        }

        // Finalize POST data.
        var data = {
            time_entry: redmine_entry,
            toggl_ids: toggl_entry.ids
        };

        // Push the data to Redmine.
        T2R.redmineService.request({
            async: true,
            url: '/toggl2redmine/import',
            method: 'post',
            context: $tr,
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function(data, status, xhr) {
                console.debug('Request successful', data);
                var $tr = $(this).addClass('t2r-success');

                // Disable checkboxes.
                $checkbox.removeAttr('checked');
                $tr.find(':input').attr('disabled', 'disabled');

                // Display success message.
                var $message = T2RRenderer.render('StatusLabel', {
                    label: 'Imported',
                    description: 'Successfully imported to Redmine.',
                });
                $tr.find('td.status').html($message);
            },
            error: function(xhr, textStatus) {
                console.error('Request failed');
                var $tr = $(this).addClass('t2r-error');

                // Prepare and display error message.
                var status = {
                    label: 'Failed',
                    icon: 'error'
                };
                var sR = xhr.responseText || 'false';
                try {
                    var oR = jQuery.parseJSON(sR);
                    var errors = ('undefined' === typeof oR.errors)
                        ? 'Unknown error' : oR.errors;
                } catch (e) {
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

    // Refresh the Redmine report when all items are processed.
    T2R.__publishWatcher = setInterval(function () {
        if (T2R.redmineService.requestQueue.length === 0) {
            clearInterval(T2R.__publishWatcher);
            T2R.unlockPublishForm();
            T2R.updateRedmineReport();
            T2R.updateLastImported();
        }
    }, 250);
}

/**
 * Refresh the Toggl report table.
 */
T2R.updateTogglReport = function () {
    // Prepare the table for update.
    var $table = T2R.getTogglTable().addClass('t2r-loading');
    $table.find('tbody').html('');

    // Determine report date.
    const date = T2R.tempStorage.get('date');
    const query = {
        from: date + ' 00:00:00',
        till: date + ' 23:59:59',
        workspace: T2R.localStorage.get('toggl-workspace')
    }

    // Update other elements.
    T2R.updateTogglReportLink({
        date: date,
        workspace: query.workspace
    });

    // Lock the publish form.
    T2R.lockPublishForm();

    // Uncheck the "check all" checkbox.
    const $checkAll = $table.find('.check-all')
        .prop('checked', false)
        .attr('disabled', 'disabled');

    // Fetch time entries from Toggl.
    T2R.redmineService.getTogglTimeEntries(query, function (entries) {
        var $table = T2R.getTogglTable();
        var pendingEntriesExist = false;

        // Prepare rounding rules.
        const roundingValue = T2R.localStorage.get('rounding-value')
        const roundingMethod = T2R.localStorage.get('rounding-direction')

        for (const key in entries) {
            const entry = entries[key]

            entry.duration = new duration.Duration(Math.max(0, entry.duration))
            entry.roundedDuration = new duration.Duration(entry.duration.seconds)

            // Prepare rounded duration as per rounding rules.
            if (roundingMethod !== '' && roundingValue > 0) {
                entry.roundedDuration.roundTo(roundingValue, roundingMethod)
            }
            else {
                entry.roundedDuration.roundTo(1, duration.Rounding.Regular)
            }

            // Include the entry in the output.
            entries[key] = entry
        }

        // Display entries that are running at the moment.
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'running') {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                delete entries[key];
            }
        }

        // Display entries eligible for import.
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length === 0) {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                pendingEntriesExist = true;
            }
        }

        // Display entries not eligible for import.
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length > 0) {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }

        // Display entries which are already import.
        for (const key in entries) {
            const entry = entries[key];
            if (entry.status === 'imported') {
                const $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }

        // Display empty table message, if required.
        if (0 === entries.length) {
            const markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').append(markup);
        }

        // Initialize widgets.
        Widget.initialize($table);

        // Update totals.
        T2R.updateTogglTotals();

        // Remove loader.
        $table.removeClass('t2r-loading');

        // If pending entries exist.
        if (pendingEntriesExist) {
            // If the update was triggered from the filter form, then focus the
            // "check-all" button to allow easier keyboard navigation.
            if (T2R.getFilterForm().has(':focus').length > 0) {
                $checkAll.focus();
            }

            // Enable the "check-all" checkbox.
            $checkAll.removeAttr('disabled');

            // Unlock publish form.
            T2R.unlockPublishForm();
        }
    });
}

/**
 * Updates the Toggl report URL.
 *
 * @param {object} data
 *   An object containing report URL variables.
 *     - date: The date.
 *     - workspace: Workspace ID.
 */
T2R.updateTogglReportLink = function (data) {
    data.workspace = data.workspace || T2R.tempStorage.get('default_toggl_workspace', 0);

    var url = T2R_TOGGL_REPORT_URL_FORMAT
        .replace(/\[@date\]/g, data.date)
        .replace('[@workspace]', data.workspace);
    $('#toggl-report-link').attr('href', url);
}

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateTogglTotals = function () {
    var $table = T2R.getTogglTable();
    var total = new duration.Duration();

    // Iterate over all rows and add the hours.
    $table.find('tbody tr').each(function () {
        const $tr = $(this);
        const dur = new duration.Duration()

        // Ignore erroneous rows.
        if ($tr.hasClass('t2r-error')) {
            return;
        }

        // Ignore unchecked rows.
        if (!$tr.find('.cb-import').is(':checked')) {
            return;
        }

        // Parse the input as time and add it to the total.
        const hours = $tr.find('[data-property="hours"]').val() as string;
        try {
            // Assume time to be hours and minutes.
            dur.setHHMM(hours);
            total.add(dur);
        } catch(e) {
            console.error(e);
        }
    });

    // Show the total in the table footer.
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
}

/**
 * Updates the Redmine time entry report.
 */
T2R.updateRedmineReport = function () {
    // Prepare the table for update.
    var $table = T2R.getRedmineTable().addClass('t2r-loading');
    $table.find('tbody').html('');

    // Determine Redmine API friendly date range.
    var till = T2R.tempStorage.get('date');
    till = utils.dateStringToObject(till);
    var from = till;

    // Fetch time entries from Redmine.
    const query = {
        from: from.toISOString().split('T')[0] + 'T00:00:00Z',
        till: till.toISOString().split('T')[0] + 'T00:00:00Z'
    };

    // Update Redmine report link.
    T2R.updateRedmineReportLink({
        date: T2R.tempStorage.get('date')
    });

    // Fetch time entries from Redmine.
    T2R.redmineService.getTimeEntries(query, (entries: any[] | null) => {
        if (entries === null) {
            flash.error('An error has occurred. Please try again after some time.')
            entries = []
        }

        const $table = T2R.getRedmineTable().addClass('t2r-loading');

        // Display entries from Redmine.
        for (const key in entries) {
            const entry = entries[key];
            const markup = T2RRenderer.render('RedmineRow', entry);
            $table.find('tbody').append(markup);
        }

        // Display empty table message, if required.
        if (0 === entries.length) {
            const markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').html(markup);
        }

        // Update totals.
        T2R.updateRedmineTotals();

        // Remove loader.
        $table.removeClass('t2r-loading');
    });
}

/**
 * Updates the Redmine report URL.
 *
 * @param {object} data
 *   An object containing report URL variables.
 *     - date: Report date.
 */
T2R.updateRedmineReportLink = function (data) {
    var url = T2R_REDMINE_REPORT_URL_FORMAT
        .replace('[@date]', data.date);
    $('#redmine-report-link').attr('href', url);
}

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateRedmineTotals = function () {
    const $table = T2R.getRedmineTable()
    const total = new duration.Duration()

    // Iterate over all rows and add the hours.
    $table.find('tbody tr .hours').each(function (i) {
        const hours = $(this).text().trim();
        if (hours.length > 0) {
            total.add(new duration.Duration(hours));
        }
    });

    // Show the total in the table footer.
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
}

/**
 * Updates the date of the latest time entry on Redmine.
 */
T2R.updateLastImportDate = function () {
    const $context = $('#last-imported')
    T2R.redmineService.getLastImportDate((lastImportDate) => {
        const sDate = lastImportDate ? lastImportDate.toLocaleDateString() : 'Unknown';
        console.debug(`Last import date: ${sDate}`)
        $context.text(sDate).removeClass('t2r-loading');
    },{
        beforeSend: function () {
            $context.html('&nbsp;').addClass('t2r-loading');
        },
    })
}

/**
 * Toggl 2 Redmine Renderer.
 */
const T2RRenderer: any = {};

T2RRenderer.renderRedmineProjectLabel = function (project: any) {
    project ||= { name: 'Unknown', path: 'javascript:void(0)', status: 1 };
    project.classes = ['project'];
    if (project.status != 1) {
        project.classes.push('closed');
    }

    return '<a href="' + project.path + '" class="' + project.classes.join(' ') + '"><strong>'
        + utils.htmlEntityEncode(project.name)
        + '</strong></a>';
}

T2RRenderer.renderRedmineIssueLabel = function (issue: any): string {
    if (typeof issue['id'] == 'undefined' || !issue.id) return '-'
    if (!issue.path) return issue.id.toString()

    // Render a clickable issue label.
    return '<a href="' + issue.path + '" target="_blank">'
        + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
        + '</a>'
};

T2RRenderer.renderTogglRow = function (data: any) {
    const issue = data.issue || null
    const project = data.project || null;
    const oDuration = data.duration;
    const rDuration = data.roundedDuration;

    // Build a label for the issue.
    const issueLabel = T2RRenderer.render('RedmineIssueLabel', issue || { id: data.id })

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

    // Attach the entry for reference.
    $tr.data('t2r.entry', data);
    const $checkbox = $tr.find('.cb-import');

    // Status specific actions.
    switch (data.status) {
        case 'pending':
            // Display errors, if any.
            if (data.errors.length > 0) {
                $tr.addClass('t2r-error');
                $tr.find(':input').attr({
                    'disabled': 'disabled'
                });

                // Display status.
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

            // Display status.
            var $message = T2RRenderer.render('StatusLabel', {
                label: 'Imported',
                description: 'Already imported to Redmine.',
            });
            $tr.find('td.status').html($message);
            break;

        case 'running':
            $tr.addClass('t2r-running');
            $tr.find(':input').attr('disabled', 'disabled');

            // Display status.
            var $message = T2RRenderer.render('StatusLabel', {
                label: 'Active',
                description: 'Entry cannot be imported because the timer is still running on Toggl.',
                icon: 'warning'
            });
            $tr.find('td.status').html($message);
            break;
    }

    // Attach event listeners.
    $tr.find('input[data-property=hours]')
      .on('input', T2R.updateTogglTotals)
      .on('change', T2R.updateTogglTotals)

    $tr.find('.cb-import')
      .on('change', T2R.updateTogglTotals)

    return $tr;
};

T2RRenderer.renderRedmineRow = function (data: any) {
    const issue = data.issue
    const project = data.project
    const dur = new duration.Duration(data.duration)
    dur.roundTo(1, duration.Rounding.Up)

    // Build a label for the issue.
    const issueLabel = T2RRenderer.render('RedmineIssueLabel', issue)

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

    // If there's no associated issue.
    if (!issue) {
        $tr.addClass('error');
        $tr.find(':input').attr({
            'disabled': 'disabled'
        });
    }

    // Initialize widgets.
    Widget.initialize($tr);

    $tr.find('.js-contextmenu').bind('click', contextMenuRightClick);

    return $tr;
};

/**
 * Renders and returns a status label with an optional message.
 *
 * @param {*} data
 *   An object containing the following indices:
 *   - label: A status text. Example: Failed.
 *   - description: A status message. Example: Time entry is not valid.
 *   - icon: The icon to display. Example: check, error, warning.
 */
T2RRenderer.renderStatusLabel = function (data: any) {
    // Fallback to defaults.
    data = jQuery.extend({
        label: 'Unknown',
        description: '',
        icon: 'checked'
    }, data);

    // Prepare a label.
    var $message = $('<span>' + data.label + '</span>')
        .addClass('icon icon-' + data.icon);
    // Add detailed message as tooltip.
    if (data.description) {
        $message.attr('title', data.description);
    }

    return $message.tooltip();
};

/**
 * Renders data with a mentioned template.
 *
 * @param {string} template
 *   Template ID.
 * @param {*} data
 *   The data to render.
 *
 * @returns {*}
 *   Rendered output.
 */
T2RRenderer.render = function (template: string, data: any): any {
    const method = 'render' + template;
    if (typeof T2RRenderer[method] === 'undefined') {
        throw `To render "${template}", define T2RRenderer.${method}`
    }
    return T2RRenderer[method](data);
};

/**
 * This is where it starts.
 */
$(() => {
    Widget.initialize();
    T2R.initTogglReport();
    T2R.initFilterForm();
    T2R.updateLastImportDate();
    T2R.initPublishForm();
});
