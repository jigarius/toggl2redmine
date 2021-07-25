// @ts-nocheck

// Redmine base URL.
const T2R_REDMINE_URL: string = window.location.origin;
declare const T2R_REDMINE_API_KEY: string;
declare const T2R_REDMINE_REPORT_URL_FORMAT : string;
declare const T2R_TOGGL_REPORT_URL_FORMAT: string;
declare const T2R_BUTTON_ACTIONS: string;
declare const contextMenuRightClick: any;

import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import {translate as t} from "./t2r/i18n.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js"
import * as flash from "./t2r/flash.js"

/**
 * Toggl 2 Redmine Helper.
 */
let T2R: any = {
    // Browser storage.
    localStorage: new LocalStorage(),
    // Temporary storage.
    tempStorage: new TemporaryStorage(),
    // Cache storage.
    cacheStorage: new TemporaryStorage()
};

/**
 * Returns the form containing filters.
 *
 * @return {Object}
 *   jQuery object for the filter form.
 */
T2R.getFilterForm = function () {
    return $('#filter-form');
};

/**
 * Returns the form to publish data to Redmine.
 *
 * @return {Object}
 *   jQuery object for the publish form.
 */
T2R.getPublishForm = function () {
    return $('#publish-form');
};

/**
 * Returns the Toggl report table.
 *
 * @return {Object}
 *   jQuery object for the Toggl report table.
 */
T2R.getTogglTable = function () {
    return $('#toggl-report');
};

/**
 * Returns the Redmine report table.
 *
 * @return {Object}
 *   jQuery object for the Redmine report table.
 */
T2R.getRedmineTable = function () {
    return $('#redmine-report');
};

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
};

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
};

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
        date: T2R.dateFormatYYYYMMDD().substr(0, 10),
        'toggl-workspace': T2R.localStorage.get('t2r.toggl-workspace'),
        'default-activity': T2R.localStorage.get('t2r.default-activity'),
        'rounding-value': T2R.localStorage.get('t2r.rounding-value'),
        'rounding-direction': T2R.localStorage.get('t2r.rounding-direction')
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
};

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
    T2R.localStorage.set('t2r.default-activity', defaultActivity);

    // Determine toggl workspace.
    var $togglWorkspace = $('select#toggl-workspace');
    var togglWorkspace = $togglWorkspace.val();
    if (null === togglWorkspace) {
        togglWorkspace = $togglWorkspace.data('selected');
    }
    T2R.localStorage.set('t2r.toggl-workspace', togglWorkspace);

    // Determine rounding value.
    let roundingValue = $('input#rounding-value').val();
    roundingValue = roundingValue ? parseInt(roundingValue as string) : 0;
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
    T2R.localStorage.set('t2r.rounding-value', roundingValue);

    // Determine rounding direction.
    let roundingMethod = $('select#rounding-direction').val();
    T2R.localStorage.set('t2r.rounding-direction', roundingMethod);

    // Determine date filter.
    var $date = $('#date');
    var sDate = $date.val();
    try {
        if (!sDate) {
            throw 'Invalid date.';
        }
        var oDate = utils.dateStringToObject(sDate + ' 00:00:00');
    } catch (e) {
        $date.focus();
        return false;
    }

    // Store date and update URL hash.
    T2R.tempStorage.set('date', sDate);
    window.location.hash = T2R.tempStorage.get('date');

    // Show date in the headings.
    $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');

    // Log the event.
    console.info('Filter form updated: ', {
        'date': T2R.tempStorage.get('date'),
        'default-activity': T2R.localStorage.get('t2r.default-activity'),
        'toggl-workspace': T2R.localStorage.get('t2r.toggl-workspace'),
        'rounding-value': T2R.localStorage.get('t2r.rounding-value'),
        'rounding-direction': T2R.localStorage.get('t2r.rounding-direction')
    });

    // Update both the Redmine and Toggl reports.
    setTimeout(function() {
        T2R.updateRedmineReport();
        T2R.updateTogglReport();
    }, 250);

    // Unlock the publish form if it was previously locked.
    T2R.unlockPublishForm();
};

/**
 * Publish form initializer.
 */
T2R.initPublishForm = function () {
    T2R.getPublishForm().submit(T2R.handlePublishForm);
};

/**
 * Locks the publish form.
 *
 * This disallows the user to submit the form.
 */
T2R.lockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').attr('disabled', 'disabled');
};

/**
 * Unlocks the publish form.
 *
 * This allows the user to submit it.
 */
T2R.unlockPublishForm = function () {
    T2R.getPublishForm().find('#btn-publish').removeAttr('disabled');
};

/**
 * Publish form submission handler.
 */
T2R.handlePublishForm = function() {
    if (confirm('This action cannot be undone. Do you really want to continue?')) {
        setTimeout(T2R.publishToRedmine);
    }
    return false;
};

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
        T2R.redmineRequest({
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
        if (T2RAjaxQueue.isEmpty()) {
            clearInterval(T2R.__publishWatcher);
            T2R.unlockPublishForm();
            T2R.updateRedmineReport();
            T2R.updateLastImported();
        }
    }, 250);
};

/**
 * Returns basic auth headers for the username:password combination.
 *
 * @param {string} username
 *   The username.
 * @param {string} password
 *   The password.
 *
 * @returns object
 *   Basic auth headers.
 */
T2R.getBasicAuthHeader = function (username, password) {
    var userpass = username + ':' + password;
    return {
        Authorization: 'Basic ' + btoa(userpass)
    };
};

/**
 * Formats date as YYYY-MM-DD.
 *
 * @param {Date} date
 *   The date object. Defaults to current date.
 *
 * @returns {String}
 *   The date in YYYY-MM-DD format.
 */
T2R.dateFormatYYYYMMDD = function (date) {
    date = date || new Date();

    // Prepare date parts.
    var yyyy = date.getFullYear();
    var m = date.getMonth() + 1;
    var mm = ('00' + m).substr(-2);
    var d = date.getDate();
    var dd = ('00' + d).substr(-2);

    return yyyy + '-' + mm + '-' + dd;
};

/**
 * Gets all workspaces from Toggl.
 *
 * @param {function} callback
 *   A callback. Receives workspaces as an argument.
 */
T2R.getTogglWorkspaces = function (callback) {
    var key = 'toggl.workspaces';
    callback = callback || utils.noopCallback;

    // Use cached data, if available.
    var workspaces = T2R.cacheStorage.get(key);
    if (workspaces) {
        callback(workspaces);
        return;
    }

    // Fetch data from Toggl.
    T2R.redmineRequest({
        url: '/toggl2redmine/toggl/workspaces',
        success: function(data, status, xhr) {
            workspaces = data;
            T2R.cacheStorage.set(key, workspaces);

            // Determine default Toggl workspace.
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

/**
 * Retrieves raw time entry data from Toggl.
 *
 * @param {Object} opts
 *   Applied filters.
 * @param {function} callback
 *   A callback. Receives entries as an argument.
 *
 * @returns {Object|boolean}
 *   Data on success or false otherwise.
 */
T2R._getRawTogglTimeEntries = function (opts, callback) {
    opts = opts || {};
    var data: any = {};

    // Determine start date.
    opts.from = utils.dateStringToObject(opts.from);
    if (!opts.from) {
        alert('Error: Invalid start date!');
        return false;
    }
    data.from = opts.from.toISOString();

    // Determine end date.
    opts.till = utils.dateStringToObject(opts.till);
    if (!opts.till) {
        alert('Error: Invalid end date!');
        return false;
    }
    data.till = opts.till.toISOString();

    // Determine workspaces.
    if (opts.workspace) {
        data.workspaces = opts.workspace;
    }

    try {
        T2R.redmineRequest({
            url: '/toggl2redmine/toggl/time_entries',
            data: data,
            success: function(data, status, xhr) {
                data = ('undefined' === typeof data) ? {} : data;
                callback(data);
            }
        });
    } catch(e) {
        console.error(e);
        callback(false);
    }
};

/**
 * Retrieves normalized time entry data from Toggl.
 *
 * @param {Object} opts
 *   Applied filters.
 * @param {function} callback
 *   A callback. Receives entries as an argument.
 *
 * @returns {Object|boolean}
 *   Data on success or false otherwise.
 */
T2R.getTogglTimeEntries = function (opts, callback) {
    opts = opts || {};
    callback = callback || utils.noopCallback;

    T2R._getRawTogglTimeEntries(opts, function (entries) {
        var output = [];

        // Prepare rounding rules.
        let roundingValue = T2R.localStorage.get('t2r.rounding-value');
        let roundingMethod = T2R.localStorage.get('t2r.rounding-direction');

        for (var key in entries) {
            var entry = entries[key];
            console.groupCollapsed('Received Toggl entry: ' + key);
            console.debug('Toggl time entry: ', entry);

            // Prepare error messages for the record.
            entry.errors = entry.errors || [];

            // Prepare "duration" object.
            entry.duration = new duration.Duration(Math.max(0, entry.duration));

            // Ignore second-level precision for rounded duration.
            entry.roundedDuration = new duration.Duration(entry.duration.seconds);

            // Prepare rounded duration as per rounding rules.
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

            // If there is no issue ID associated to the entry.
            if (!entry.issue_id) {
                entry.errors.push('Could not determine issue ID. Please mention the Redmine issue ID in your Toggl task description. Example: "#1919 Feed the bunny wabbit"');
            }

            // If an issue ID exists, but no issue could be found.
            if (entry.issue_id && !entry.issue) {
                entry.errors.push('This issue was either not found on Redmine or you don\'t have access to it. Make sure you\'re using a correct issue ID and that you\'re a member of the project.');
            }

            // Include the entry in the output.
            output.push(entry);
            console.groupEnd();
        }

        callback(output);
    });
};

/**
 * Refresh the Toggl report table.
 */
T2R.updateTogglReport = function () {
    // Prepare the table for update.
    var $table = T2R.getTogglTable().addClass('t2r-loading');
    $table.find('tbody').html('');

    // Determine report date.
    var date = T2R.tempStorage.get('date');
    var opts = {
        from: date + ' 00:00:00',
        till: date + ' 23:59:59',
        workspace: T2R.localStorage.get('t2r.toggl-workspace')
    };

    // Update other elements.
    T2R.updateTogglReportLink({
        date: date,
        workspace: opts.workspace
    });

    // Lock the publish form.
    T2R.lockPublishForm();

    // Uncheck the "check all" checkbox.
    var $checkAll = $table.find('.check-all')
        .prop('checked', false)
        .attr('disabled', 'disabled');

    // Fetch time entries from Toggl.
    T2R.getTogglTimeEntries(opts, function (entries) {
        var $table = T2R.getTogglTable();
        var pendingEntriesExist = false;

        // Display currently running entries.
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'running') {
                var $tr = T2RRenderer.render('TogglRow', entry);
                var entry = $tr.data('t2r.entry');
                $table.find('tbody').append($tr);
                delete entries[key];
            }
        }

        // Display entries eligible for export.
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length === 0) {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
                pendingEntriesExist = true;
            }
        }

        // Display entries not eligible for export.
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'pending' && entry.errors.length > 0) {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }

        // Display entries which are already imported.
        for (var key in entries) {
            var entry = entries[key];
            if (entry.status === 'imported') {
                var $tr = T2RRenderer.render('TogglRow', entry);
                $table.find('tbody').append($tr);
            }
        }

        // Display empty table message, if required.
        if (0 === entries.length) {
            var markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').append(markup);
        }

        // Initialize widgets.
        T2RWidget.initialize($table);

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
};

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
};

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateTogglTotals = function () {
    var $table = T2R.getTogglTable();
    var total = new duration.Duration();

    // Iterate over all rows and add the hours.
    $table.find('tbody tr').each(function (i) {
        var $tr = $(this);

        // Ignore erroneous rows.
        if ($tr.hasClass('t2r-error')) {
            return;
        }

        // Ignore unchecked rows.
        if (!$tr.find('.cb-import').is(':checked')) {
            return;
        }

        // Parse the input as time and add it to the total.
        let hours = $tr.find('[data-property="hours"]').val() as string;
        try {
            let dur = new duration.Duration();
            // Assume time to be hours and minutes.
            dur.setHHMM(hours);
            total.add(dur);
        } catch(e) {
            console.error(e);
        }
    });

    // Show the total in the table footer.
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
};

/**
 * Retrieves raw time entry data from Redmine.
 *
 * @param {Object} query
 *   Applied filters.
 * @param {Function} callback
 *   A callback. Receives entries as an argument.
 *
 * @returns {Object|boolean}
 *   Data on success or false otherwise.
 */
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
    } catch (e) {
        callback(false);
    }
};

/**
 * Retrieves normalized time entry data from Redmine.
 *
 * @param query
 *   Query parameters.
 * @param {Function} callback
 *   A callback. Receives entries as an argument.
 *
 * @returns {Object|boolean}
 *   Data on success or false otherwise.
 */
T2R.getRedmineTimeEntries = function (query, callback) {
    query = query || {};
    callback = callback || utils.noopCallback;

    T2R._getRawRedmineTimeEntries(query, function (entries) {
        var output = [];

        for (var i in entries) {
            var entry = entries[i];
            console.groupCollapsed('Received Redmine entry: ' + entry.id);
            console.debug('Redmine time entry: ', entry);

            // Ensure an issue object.
            entry.issue = entry.issue || { id: false };

            // Generate duration in seconds.
            entry.duration = Math.floor(parseFloat(entry.hours) * 3600);

            // Include the entry in the output.
            output.push(entry);
        }

        callback(entries);
    });
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
    var opts = {
        from: from.toISOString().split('T')[0] + 'T00:00:00Z',
        till: till.toISOString().split('T')[0] + 'T00:00:00Z'
    };

    // Update Redmine report link.
    T2R.updateRedmineReportLink({
        date: T2R.tempStorage.get('date')
    });

    // Fetch time entries from Redmine.
    T2R.getRedmineTimeEntries(opts, function (entries) {
        var $table = T2R.getRedmineTable().addClass('t2r-loading');

        // Display entries from Redmine.
        for (var key in entries) {
            var entry = entries[key];
            var markup = T2RRenderer.render('RedmineRow', entry);
            $table.find('tbody').append(markup);
        }

        // Display empty table message, if required.
        if (0 === entries.length) {
            var markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
                + t('t2r.error.list_empty')
                + '</td></tr>';
            $table.find('tbody').html(markup);
        }

        // Update totals.
        T2R.updateRedmineTotals();

        // Remove loader.
        $table.removeClass('t2r-loading');
    });
};

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
};

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateRedmineTotals = function () {
    var $table = T2R.getRedmineTable();
    var total = new duration.Duration();

    // Iterate over all rows and add the hours.
    $table.find('tbody tr .hours').each(function (i) {
        let hours = $(this).text().trim();
        if (hours.length > 0) {
            total.add(new duration.Duration(hours));
        }
    });

    // Show the total in the table footer.
    $table.find('[data-property="total-hours"]').html(total.asHHMM());
};

/**
 * Updates the date of the latest time entry on Redmine.
 */
T2R.updateLastImported = function () {
    var now = T2R.dateFormatYYYYMMDD(new Date());
    T2R.redmineRequest({
        url: '/time_entries.json',
        data: {
            user_id: 'me',
            limit: 1,
            // Ignore entries made in the future.
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
            } catch (e) {}
            $(this).text(sDate).removeClass('t2r-loading');
        }
    });
};

/**
 * Gets a list of Redmine time entry activities.
 *
 * @param {function} callback
 *   A callback. Receives activities as an argument.
 */
T2R.getRedmineActivities = function (callback) {
    var key = 'redmine.activities';
    callback = callback || utils.noopCallback;

    // Use cached data, if available.
    var activities = T2R.cacheStorage.get(key);
    if (activities) {
        callback(activities);
        return;
    }

    // Fetch data from Redmine.
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

/**
 * Fetches data about a given Redmine issue.
 *
 * @param id
 *   Redmine issue ID.
 *
 * @returns {Object|boolean}
 *   Redmine issue data on success or false otherwise.
 */
T2R.getRedmineIssue = function (id) {
    var output = T2R.getRedmineIssues([id]);
    return ('undefined' == typeof output[id]) ? false : output[id];
};

/**
 * Fetches data about multiple Redmine issues.
 *
 * @param {Array} id
 *   Redmine issue IDs.
 *
 * @returns {Object|boolean}
 *   Redmine issues indexed by ID or false otherwise.
 */
T2R.getRedmineIssues = function (ids) {
    var output = {};
    // Do nothing if no IDs are sent.
    if (0 === ids.length) {
        return output;
    }
    // Fetch issue info and key them by issue ID.
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
            error: function (xhr, textStatus) {}
        });
    } catch(e) {
        console.error(e);
    }
    return output;
};

/**
 * Returns CSRF Token data generated by Redmine.
 *
 * @returns {object}
 *   An object containing "param" and "token".
 */
T2R.getRedmineCsrfToken = function () {
    var key = 'redmine.token';
    var output = T2R.cacheStorage.get(key);
    if (!output) {
        // Redmine issues CSRF tokens as META elements on the page.
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

/**
 * Sends an AJAX request to Redmine with the given options.
 *
 * Automatically injects auth headers.
 *
 * @param opts
 *   Request options.
 */
T2R.redmineRequest = function (opts) {
    opts.timeout = opts.timeout || 3000;

    // Prepend Redmine URL for relative URLs.
    if (opts.url.match(/^\//)) {
        opts.url = T2R_REDMINE_URL + opts.url;
    }

    // TODO: Use CSRF Token instead of API Key?
    // For some reason Redmine throws 401 Unauthroized despite a CSRF Token.
    opts.headers = opts.headers || {};
    opts.headers['X-Redmine-API-Key'] = T2R_REDMINE_API_KEY;

    // Queue the request.
    T2RAjaxQueue.addItem(opts);
};

/**
 * Returns the URL to a Redmine issue.
 *
 * @param {string} id
 *   Redmine issue ID.
 *
 * @return {string|boolean}
 *   Redmine issue URL if the issue ID is a valid number. False otherwise.
 */
T2R.redmineIssueURL = function (id) {
    id = parseInt(id);
    var output = null;
    if (!isNaN(id) && id > 0) {
        output = T2R_REDMINE_URL + '/issues/' + id;
    }
    return output;
};

/**
 * Toggl 2 Redmine AJAX Request Queue.
 *
 * @type {Object}
 */
var T2RAjaxQueue = T2RAjaxQueue || {};

/**
 * Queue of requests to be processed.
 *
 * @type {Object}
 * @private
 */
T2RAjaxQueue.__items = [];

/**
 * Whether a request is in progress.
 *
 * @type {Boolean}
 * @private
 */
T2RAjaxQueue.__requestInProgress = false;

/**
 * Number or requests currently in the queue.
 *
 * @returns {Number}
 */
T2RAjaxQueue.size = function () {
    return T2RAjaxQueue.__items.length;
}

/**
 * Whether there are no requests in the queue.
 *
 * @returns {Boolean}
 */
T2RAjaxQueue.isEmpty = function () {
    return T2RAjaxQueue.__items.length === 0;
}

/**
 * Adds an AJAX request to the execution queue.
 *
 * Requests be executed one after the other until all items in the queue have
 * been processed.
 */
T2RAjaxQueue.addItem = function (opts) {
    T2RAjaxQueue.__items.push(opts);
    T2RAjaxQueue.processItem();
};

/**
 * Processes an AJAX request present in the queue.
 */
T2RAjaxQueue.processItem = function () {
    // If queue is empty, do nothing.
    if (0 === T2RAjaxQueue.__items.length) {
        return;
    }

    // If a request is in progress, do nothing.
    if (T2RAjaxQueue.__requestInProgress) {
        return;
    }
    T2RAjaxQueue.__requestInProgress = true;
    console.groupCollapsed('Processing AJAX queue (' + T2RAjaxQueue.size() + ' remaining).');

    // Prepare current item.
    var opts = T2RAjaxQueue.__items.shift();
    console.log('Sending item: ', opts);
    var callback = opts.complete || function () {};
    opts.complete = function (xhr, status) {
        // Call the original callback.
        var context = this;
        callback.call(context, xhr, status);

        // Process the next item in the queue, if any.
        T2RAjaxQueue.__requestInProgress = false;
        T2RAjaxQueue.processItem();
    };

    // Process current item.
    $.ajax(opts);
    console.groupEnd();
}

/**
 * Toggl 2 Redmine widget manager.
 */
let T2RWidget: any = {};

/**
 * Initializes all widgets in the given element.
 *
 * @param {Object} el
 */
T2RWidget.initialize = function (el = document.body) {
    $(el).find('[data-t2r-widget]').each(function() {
        var el = this, $el = $(this);
        var widgets = $el.attr('data-t2r-widget').split(' ');
        for (var i in widgets) {
            var widget = widgets[i];
            var widgetFlag = 'T2RWidget' + widget + 'Init';
            // Initialize the widget, if required.
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

T2RWidget.initTooltip = function(el) {
    $(el).tooltip();
}

T2RWidget.initAjaxDeleteLink = function(el) {
    $(el).click(function (e) {
        var $link = $(this);
        e.preventDefault();

        // Confirm action.
        var message = 'Are you sure?';
        if (!confirm(message)) {
            return false;
        }

        // Determine parameters.
        var context = $link.attr('data-t2r-delete-link-context');
        var $context = $link.closest(context);
        var url = $link.attr('href');
        var callback = $link.attr('data-t2r-delete-link-callback');

        // URL must be defined.
        if (!url) {
            throw 'T2RDeleteLink: URL must be defined in "href" attribute.';
        }

        // Context must be defined.
        if (typeof context === 'undefined') {
            throw 'T2RDeleteLink: Context must be defined in "data-t2r-delete-link-context" attribute.';
        }

        // Prepare AJAX request.
        T2R.redmineRequest({
            url: url + '.json',
            async: true,
            data: '{}',
            method: 'DELETE',
            complete: function(xhr, textStatus) {
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
}

T2RWidget.initTogglRow = function(el) {
    var $el = $(el);

    // If checkbox changes, update totals.
    $el.find('.cb-import')
        .change(T2R.updateTogglTotals)
        // Make all inputs required.
        .change(function () {
            var $checkbox = $(this);
            var checked = $checkbox.is(':checked');
            var $tr = $checkbox.closest('tr');

            // If the row is marked for import, make fields required.
            if (checked) {
                $tr.find(':input').not('.cb-import')
                    .removeAttr('disabled')
                    .attr('required', 'required');
            }
            // Otherwise, the fields are disabled.
            else {
                $tr.find(':input').not('.cb-import')
                    .removeAttr('required')
                    .attr('disabled', 'disabled');
            }
        })
        .trigger('change');

    // Initialize tooltips for all inputs.
    $el.find(':input').tooltip();
};

T2RWidget.initDurationInput = function (el) {
    var $el = $(el);
    $el
        .bind('input', function() {
            var val = $el.val();
            try {
                // If a duration object could be created, then the the time is valid.
                new duration.Duration(val);
                el.setCustomValidity('');
            } catch (e) {
                el.setCustomValidity(e);
            }
        })
        // Update totals as the user updates hours.
        .bind('input', T2R.updateTogglTotals)
        .bind('keyup', function (e) {
            let $input = $(this);
            let dur = new duration.Duration();

            // Detect current duration.
            try {
                dur.setHHMM(($input.val() as string));
            } catch(e) {
                return;
            }

            // Round to the nearest 5 minutes or 15 minutes.
            var minutes = dur.minutes % 60;
            var step = e.shiftKey ? 15 : 5;
            let delta: number = 0

            // On "Up" press.
            if (e.key === 'ArrowUp') {
                delta = step - (minutes % step);
                dur.add(new duration.Duration(delta * 60));
            }
            // On "Down" press.
            else if (e.key === 'ArrowDown') {
                delta = (minutes % step) || step;
                dur.sub(new duration.Duration(delta * 60));
            }
            // Do nothing.
            else {
                return;
            }

            // Update value in the input field.
            $(this).val(dur.asHHMM()).trigger('input').select();
        })
        .bind('change', function () {
            let $input = $(this);
            let value = '';

            // Determine the visible value.
            try {
                let dur = new duration.Duration();
                dur.setHHMM(($input.val() as string));
                value = dur.asHHMM();
            } catch(e) {}

            // Update the visible value and the totals.
            $input.val(value);
            T2R.updateTogglTotals();
        });
};

T2RWidget.initRedmineActivityDropdown = function (el) {
    var $el = $(el);
    T2R.getRedmineActivities(function (activities) {
        // Prepare placeholder.
        var placeholder = $el.attr('placeholder') || $el.data('placeholder');

        // Prepare options.
        var options = {};
        for (var i in activities) {
            var activity = activities[i];
            options[activity.id] = activity.name;
        }

        // Generate a SELECT element and use it's options.
        var $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });

        $el.append($select.find('option'));

        // Mark selection.
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

        // Prepare options.
        var options = {};
        for (var i in workspaces) {
            var workspace = workspaces[i];
            options[workspace.id] = workspace.name;
        }

        // Generate a SELECT element and use it's options.
        var $select = T2RRenderer.render('Dropdown', {
            placeholder: placeholder,
            options: options
        });

        $el.append($select.find('option'));

        // Mark selection.
        var value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
};

T2RWidget.initDurationRoundingDirection = function (el: any) {
    let $el = $(el);

    // Prepare rounding options.
    let options = {}
    options[duration.Rounding.Regular] = 'Round off'
    options[duration.Rounding.Up] = 'Round up'
    options[duration.Rounding.Down] = 'Round down'

    // Generate a SELECT element and use it's options.
    var $select = T2RRenderer.render('Dropdown', {
        placeholder: 'Don\'t round',
        options: options
    });

    $el.append($select.find('option'));
};

/**
 * Toggl 2 Redmine Renderer.
 */
let T2RRenderer: any = {};

T2RRenderer.renderDropdown = function (data: any) {
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

T2RRenderer.renderDuration = function (data: any) {
    data = Math.ceil(data / 60);
    var h = Math.floor(data / 60);
    var output = h;
    var m = data % 60;
    output += ':' + ('00' + m).substr(-2);
    return output;
};

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

T2RRenderer.renderRedmineIssueLabel = function (data: any) {
    // If the issue is invalid, do nothing.
    var issue = data;
    if (!issue || !issue.id) {
        return false;
    }

    // Render a clickable issue label.
    var markup = '<a href="' + T2R.redmineIssueURL(issue.id) + '" target="_blank">'
        + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
        + '</a>';
    return markup;
};

T2RRenderer.renderTogglRow = function (data: any) {
    var issue = data.issue || null;
    var project = data.project || null;
    var oDuration = data.duration;
    var rDuration = data.roundedDuration;

    // Build a label for the issue.
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

    // Attach the entry for reference.
    $tr.data('t2r.entry', data);

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

    return $tr;
};

T2RRenderer.renderRedmineRow = function (data: any) {
    var issue = data.issue.id ? data.issue : null;
    var project = data.project ? data.project : null;

    // Build a label for the issue.
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

    // If there's no associated issue.
    if (!issue) {
        $tr.addClass('error');
        $tr.find(':input').attr({
            'disabled': 'disabled'
        });
    }

    // Initialize widgets.
    T2RWidget.initialize($tr);

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
    T2RWidget.initialize();
    T2R.initTogglReport();
    T2R.initFilterForm();
    T2R.updateLastImported();
    T2R.initPublishForm();
});
