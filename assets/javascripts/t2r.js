'use strict';

/**
 * Toggl 2 Redmine Helper.
 */
var T2R = T2R || {};

/**
 * Redmine Base URL.
 *
 * @type {string}
 */
T2R.REDMINE_URL = T2R.REDMINE_URL || window.location.origin;

/**
 * Redmine API Key.
 *
 * @type {string}
 */
T2R.REDMINE_API_KEY = T2R.REDMINE_API_KEY || false;

/**
 * Toggl API Key.
 *
 * @type {string}
 */
T2R.TOGGL_API_KEY = T2R.TOGGL_API_KEY || false;

/**
 * Redmine time report URL format.
 *
 * @type {string}
 */
T2R.REDMINE_REPORT_URL_FORMAT = T2R.REDMINE_REPORT_URL_FORMAT || '';

/**
 * Toggl time report URL format.
 *
 * @type {string}
 */
T2R.TOGGL_REPORT_URL_FORMAT = T2R.TOGGL_REPORT_URL_FORMAT || '';

/**
 * Translations for UI elements.
 *
 * @type {{}}
 */
T2R.TRANSLATIONS = T2R.TRANSLATIONS || {};

/**
 * Cached data.
 *
 * @type {Object}
 */
T2R.cacheData = {};

/**
 * Local storage data.
 *
 * @type {Object}
 */
T2R.storageData = {};

/**
 * This is where it starts.
 */
T2R.initialize = function () {
  T2RConsole.initialize();
  T2RWidget.initialize();
  T2R.initTogglReport();
  T2R.initFilterForm();
  T2R.updateLastImported();
  T2R.initPublishForm();
};

/**
 * Get or set objects from or to the local storage.
 *
 * @param {string} key
 *   Storage key.
 *
 * @param {*} value
 *   Storage value. Ignore this argument for "get" requests.
 *
 * @returns {*}
 *   Stored value if found.
 */
T2R.storage = function (key, value) {
  // Set data.
  if (2 === arguments.length) {
    value = (undefined === value) ? null : value;
    T2R.storageData[key] = value;
    return value;
  }
  // Get data.
  else {
    return ('undefined' !== typeof T2R.storageData[key])
      ? T2R.storageData[key] : null;
  }
};

/**
 * Get or set objects from or to the browser storage.
 *
 * @param {string} key
 *   Cache key.
 *
 * @param {*} value
 *   Cache value. Ignore this argument for "get" requests.
 *
 * @returns {*}
 *   Cached value if found.
 */
T2R.browserStorage = function (key, value) {
  if (2 === arguments.length) {
    value = (undefined === value) ? null : value;
    if (undefined !== window.localStorage) {
      if (null === value) {
        window.localStorage.removeItem(key)
      }
      else {
        window.localStorage.setItem(key, value);
      }
    }
    return value;
  }
  else {
    return ('undefined' !== window.localStorage)
      ? window.localStorage.getItem(key) : value;
  }
};

/**
 * Equivalent of I18n.t().
 *
 * @param {string} key
 *   String ID.
 * @param {{}} vars
 *   Key-value pair of variables to replace.
 *
 * @example
 *   T2R.t('hello', { name: 'Junior' });
 *
 *   This replaces '@name' with 'Junior'.
 *
 * @returns {string}
 *   Translated string if available.
 */
T2R.t = function(key, vars = {}) {
  if (T2R.TRANSLATIONS[key] === undefined) {
    var lang = $('html').attr('lang') || '??';
    return 'translation missing: ' + lang + '.' + key;
  }

  var result = T2R.TRANSLATIONS[key];
  for (var v in vars) {
    result = result.replace('@' + v, vars[v])
  }

  return result;
}

/**
 * A callback which simply logs all arguments to the console.
 *
 * @param {*} data
 *   Arguments.
 */
T2R.FAKE_CALLBACK = function (data) {
  T2RConsole.warn('No callback was provided to handle this data: ', data);
};

/**
 * Get or set objects from or to the cache.
 *
 * @param {string} key
 *   Cache key.
 *
 * @param {*} value
 *   Cache value. Ignore this argument for "get" requests.
 *
 * @returns {*}
 *   Cached value if found.
 */
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

/**
 * Displays a rails-style flash message.
 *
 * @todo Use rails' way of doing flash messages on the client-side.
 *
 * @param {String} message
 *   The message.
 * @param {String} type
 *   [optional] One of "notice", "error", "warning". Defaults to "notice".
 * @param {Number} timeout
 *   [optional] Timeout in seconds.
 */
T2R.flash = function (message, type = 'notice', timeout = false) {
  type = type || 'notice';
  timeout = ('number' === typeof timeout) ? timeout : false;
  var $message = $('<div class="flash t2r ' + type + '">' + message.trim() + '</div>');
  $('#content').prepend($message);
  // Remove the message after timeout.
  if (timeout) {
    setTimeout(function() {
      $message.remove();
    }, timeout * 1000);
  }
};

/**
 * Removes all flash messages previously set.
 */
T2R.clearFlashMessages = function () {
  $('.t2r.flash').remove();
};

/**
 * Returns a string after encoding HTML entities.
 *
 * @param String string
 */
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
    date: T2R.getDateFromLocationHash()
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
    'toggl-workspace': T2R.browserStorage('t2r.toggl-workspace'),
    'default-activity': T2R.browserStorage('t2r.default-activity'),
    'rounding-value': T2R.browserStorage('t2r.rounding-value'),
    'rounding-direction': T2R.browserStorage('t2r.rounding-direction')
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
  T2R.browserStorage('t2r.default-activity', defaultActivity);

  // Determine toggl workspace.
  var $togglWorkspace = $('select#toggl-workspace');
  var togglWorkspace = $togglWorkspace.val();
  if (null === togglWorkspace) {
    togglWorkspace = $togglWorkspace.data('selected');
  }
  T2R.browserStorage('t2r.toggl-workspace', togglWorkspace);

  // Determine rounding value.
  var roundingValue = $('input#rounding-value').val() || 0;
  roundingValue = parseInt(roundingValue);
  roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
  T2R.browserStorage('t2r.rounding-value', roundingValue);

  // Determine rounding direction.
  var roundingDirection = $('select#rounding-direction').val();
  T2R.browserStorage('t2r.rounding-direction', roundingDirection);

  // Determine date filter.
  var $date = $('#date');
  var sDate = $date.val();
  try {
    if (!sDate) {
      throw 'Invalid date.';
    }
    var oDate = T2R.dateStringToObject(sDate + ' 00:00:00');
  } catch (e) {
    $date.focus();
    return false;
  }

  // Store date and update URL hash.
  T2R.storage('date', sDate);
  window.location.hash = T2R.storage('date');

  // Show date in the headings.
  $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');

  // Log the event.
  T2RConsole.separator();
  T2RConsole.log('Filter form updated: ', {
    'date': T2R.storage('date'),
    'default-activity': T2R.browserStorage('t2r.default-activity'),
    'toggl-workspace': T2R.browserStorage('t2r.toggl-workspace'),
    'rounding-value': T2R.browserStorage('t2r.rounding-value'),
    'rounding-direction': T2R.browserStorage('t2r.rounding-direction')
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
 * Gets date from window.location.hash.
 */
T2R.getDateFromLocationHash = function () {
  var output = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
  // Must be a valid date.
  output = output ? output.pop() : false;
  if (output && !T2R.dateStringToObject(output)) {
    output = false;
  }
  T2RConsole.log('Got date from URL fragment', output);
  return output;
}

/**
 * Publishes selected Toggl data to Redmine.
 */
T2R.publishToRedmine = function () {
  T2R.lockPublishForm();

  // Clear flash messages.
  T2R.clearFlashMessages();

  // Check for eligible entries.
  var $checkboxes = $('#toggl-report tbody tr input.cb-import');
  if ($checkboxes.filter(':checked').length <= 0) {
    T2R.flash('Please select the entries which you want to import to Redmine.', 'error');
    T2R.unlockPublishForm();
    return;
  }

  // Post eligible entries to Redmine.
  T2RConsole.separator();
  T2RConsole.log('Pushing time entries to Redmine.');
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
      spent_on: T2R.storage('date'),
      issue_id: parseInt($tr.find('[data-property="issue_id"]').val()),
      comments: $tr.find('[data-property="comments"]').val(),
      activity_id: parseInt($tr.find('[data-property="activity_id"]').val()),
    };

    // Convert time to Redmine-friendly format, i.e. hh:mm.
    var durationInput = $tr.find('[data-property="hours"]').val();
    var duration = new T2RDuration();
    try {
      duration.setHHMM(durationInput);
      redmine_entry.hours = duration.asDecimal(true);
    } catch (e) {
      T2RConsole.warn('Invalid duration. Ignoring entry.', redmine_entry);
      return;
    }

    // Ignore entries with 0 duration.
    if (duration.getSeconds(true) <= 0) {
      T2RConsole.warn('Duration is zero. Ignoring entry.', redmine_entry);
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
        T2RConsole.log('Request successful', data);
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
        T2RConsole.log('Request failed');
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
 * Converts a date string into a Date object.
 *
 * @param {string} string
 *   The string to parse as a date.
 *
 * @returns {Date}
 *   The date as an object.
 */
T2R.dateStringToObject = function (string) {
  try {
    // Split the date into parts.
    // Don't use Date.parse() as it works differently depending on the browser.
    var dateParts = string.split(/[^\d]/);

    // Must have at least the "date" part.
    if (dateParts.length < 3) {
      throw ('Date must contain at least YYYY-MM-DD');
    }

    // Assume time parts to be 00 if not defined.
    for (var i = 3; i <= 6; i++) {
      if (typeof dateParts[i] === 'undefined') {
        dateParts[i] = 0;
      }
    }

    // Adjust month count to begin with 0.
    dateParts[1] = parseInt(dateParts[1]);
    dateParts[1] -= 1;

    // Create date with yyyy-mm-dd hh:mm:ss ms.
    return new Date(
      dateParts[0],
      dateParts[1],
      dateParts[2],
      dateParts[3],
      dateParts[4],
      dateParts[5],
      dateParts[6]
    );
  }
  catch (e) {
    T2RConsole.log('Date not understood', string);
    return false;
  }
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
  callback = callback || T2R.FAKE_CALLBACK;

  // Use cached data, if available.
  var workspaces = T2R.cache(key);
  if (workspaces) {
    callback(workspaces);
    return;
  }

  // Fetch data from Toggl.
  T2R.redmineRequest({
    url: '/toggl2redmine/toggl/workspaces',
    success: function(data, status, xhr) {
      workspaces = data;
      T2R.cache(key, workspaces);
      callback(workspaces);
    },
    error: function (xhr, textStatus) {
      T2R.flash('Could not fetch Toggl Workspaces. Please refresh the page to try again.', 'error');
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
  var data = {};

  // Determine start date.
  opts.from = T2R.dateStringToObject(opts.from);
  if (!opts.from) {
    alert('Error: Invalid start date!');
    return false;
  }
  data.from = opts.from.toISOString();

  // Determine end date.
  opts.till = T2R.dateStringToObject(opts.till);
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
    T2RConsole.error(e);
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
  callback = callback || T2R.FAKE_CALLBACK;

  T2R._getRawTogglTimeEntries(opts, function (entries) {
    var output = [];

    // Prepare rounding rules.
    var roundingValue = T2R.browserStorage('t2r.rounding-value');
    var roundingDirection = T2R.browserStorage('t2r.rounding-direction');

    for (var key in entries) {
      var entry = entries[key];
      T2RConsole.group(key, true);
      T2RConsole.log('Toggl time entry: ', entry);

      // Prepare error messages for the record.
      entry.errors = entry.errors || [];

      // Prepare "duration" object.
      entry.duration = new T2RDuration(Math.max(0, entry.duration));

      // Ignore second-level precision for rounded duration.
      entry.roundedDuration = new T2RDuration(entry.duration.getSeconds(false));

      // Prepare rounded duration as per rounding rules.
      if (roundingDirection !== '' && roundingValue > 0) {
        entry.roundedDuration.roundTo(roundingValue, roundingDirection);
        T2RConsole.log('Duration rounded from ' + entry.duration.asHHMM() + ' to ' + entry.roundedDuration.asHHMM());
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
      T2RConsole.groupEnd();
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
  var date = T2R.storage('date');
  var opts = {
    from: date + ' 00:00:00',
    till: date + ' 23:59:59',
    workspace: T2R.browserStorage('t2r.toggl-workspace') || false
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
        + 'There are no items to display here. Did you log your time on Toggl?'
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
  data.workspace = data.workspace || 0;
  var url = T2R.TOGGL_REPORT_URL_FORMAT
    .replace(/\[@date\]/g, data.date)
    .replace('[@workspace]', data.workspace);
  $('#toggl-report-link').attr('href', url);
};

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateTogglTotals = function () {
  var $table = T2R.getTogglTable();
  var total = new T2RDuration();

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
    var hours = $tr.find('[data-property="hours"]').val();
    try {
      var duration = new T2RDuration();
      // Assume time to be hours and minutes.
      duration.setHHMM(hours);
      total.add(duration);
    } catch(e) {
      T2RConsole.error(e);
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
  callback = callback || T2R.FAKE_CALLBACK;

  T2R._getRawRedmineTimeEntries(query, function (entries) {
    var output = [];

    for (var i in entries) {
      var entry = entries[i];

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
  var till = T2R.storage('date');
  till = T2R.dateStringToObject(till);
  var from = till;

  // Fetch time entries from Redmine.
  var opts = {
    from: from.toISOString().split('T')[0] + 'T00:00:00Z',
    till: till.toISOString().split('T')[0] + 'T00:00:00Z'
  };

  // Update Redmine report link.
  T2R.updateRedmineReportLink({
    date: T2R.storage('date')
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
        + 'There are no items to display here.'
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
  var url = T2R.REDMINE_REPORT_URL_FORMAT
    .replace('[@date]', data.date);
  $('#redmine-report-link').attr('href', url);
};

/**
 * Updates the total in the Redmine report footer.
 */
T2R.updateRedmineTotals = function () {
  var $table = T2R.getRedmineTable();
  var total = new T2RDuration();

  // Iterate over all rows and add the hours.
  $table.find('tbody tr .hours').each(function (i) {
    var hours = $(this).text().trim();
    if (hours.length > 0) {
      total.add(hours);
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
        lastImported = T2R.dateStringToObject(lastImported + ' 00:00:00');
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
  callback = callback || T2R.FAKE_CALLBACK;

  // Use cached data, if available.
  var activities = T2R.cache(key);
  if (activities) {
    callback(activities);
    return;
  }

  // Fetch data from Redmine.
  T2R.redmineRequest({
    url: '/enumerations/time_entry_activities.json',
    success: function (data, status, xhr) {
      var activities = data.time_entry_activities;
      T2R.cache(key, activities);
      callback(activities);
    },
    error: function (xhr, textStatus) {
      T2R.flash('Could not fetch Redmine Activities. Please refresh the page to try again.', 'error');
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
    T2RConsole.error(e);
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
  var output = T2R.cache(key);
  if (!output) {
    // Redmine issues CSRF tokens as META elements on the page.
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
    opts.url = T2R.REDMINE_URL + opts.url;
  }

  // TODO: Use CSRF Token instead of API Key?
  // For some reason Redmine throws 401 Unauthroized despite a CSRF Token.
  opts.headers = opts.headers || {};
  opts.headers['X-Redmine-API-Key'] = T2R.REDMINE_API_KEY;

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
  var output = false;
  if (!isNaN(id) && id > 0) {
    output = T2R.REDMINE_URL + '/issues/' + id;
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
  T2RConsole.group('Processing queue. ' + T2RAjaxQueue.size() + ' remaining.');

  // Prepare current item.
  var opts = T2RAjaxQueue.__items.shift();
  T2RConsole.log('Sending item: ', opts);
  var callback = opts.complete || function () {};
  opts.complete = function (xhr, status) {
    // Call the original callback.
    var context = this;
    callback.call(context, xhr, status);
    T2RConsole.groupEnd();

    // Process the next item in the queue, if any.
    T2RAjaxQueue.__requestInProgress = false;
    T2RAjaxQueue.processItem();
  };

  // Process current item.
  $.ajax(opts);
}

/**
 * Toggl to Redmine time duration.
 *
 * @param {string}
 *   A duration as hh:mm or seconds.
 */
var T2RDuration = function (duration = null) {

  // Number of hours in the duration.
  this.__hours = 0;

  // Number of minutes in the duration.
  this.__minutes = 0;

  // Number of seconds in the duration.
  this.__seconds = 0;

  // Pass arguments to the constructor.
  if (arguments.length > 0) {
    this.setValue(duration);
  }

  return this;

};

/**
 * Round up.
 *
 * @type {string}
 */
T2RDuration.ROUND_UP = 'U';

/**
 * Round down.
 *
 * @type {string}
 */
T2RDuration.ROUND_DOWN = 'D';

/**
 * Round regular.
 *
 * @type {string}
 */
T2RDuration.ROUND_REGULAR = 'R';

/**
 * Set a value for the duration.
 *
 * @param {string} duration
 *   A duration as seconds or hours and minutes.
 *
 * @see T2RDuration.setHHMM()
 */
T2RDuration.prototype.setValue = function(duration) {
  // Seconds as an integer.
  if ('number' === typeof duration) {
    this.setSeconds(duration);
  }
  // Seconds as a string.
  else if ('string' === typeof duration && duration.match(/^\d+$/)) {
    this.setSeconds(duration);
  }
  // Something else?
  else {
    try {
      this.setHHMM(duration);
    } catch (e) {
      throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
    }
  }
};

/**
 * Sets duration from seconds.
 *
 * @param {integer} seconds
 */
T2RDuration.prototype.setSeconds = function (seconds) {
  // Set duration form seconds.
  seconds += '';
  if (!seconds.match(/^\d+$/)) {
    throw 'Error: ' + seconds + ' is not a valid number.';
  }

  // Set seconds.
  this.__seconds = parseInt(seconds);

  // Ignore second-level precision for hour and minutes computation.
  this.__minutes = Math.floor(this.__seconds / 60);
  this.__hours = Math.floor(this.__minutes / 60);
  this.__minutes = this.__minutes % 60;
};

/**
 * Gets duration as seconds.
 *
 * @param {boolean} imprecise
 *   Whether to remove second-level precision.
 *
 *   Defaults to false. When true, a duration of 95 seconds is treated as
 *   60 seconds, i.e. rounded down to the nearest full minute.
 *
 * @return {integer}
 *   Duration in seconds.
 */
T2RDuration.prototype.getSeconds = function (imprecise) {
  imprecise = 'undefined' === typeof imprecise ? false : imprecise;
  var output = this.__seconds;

  // For imprecise output, round-down to the nearest full minute.
  if (imprecise) {
    output = output - output % 60;
  }

  return output;
};

/**
 * Sets duration from hours and minutes.
 *
 * Supported formats:
 *   - 2 = 2h 00m
 *   - 2:30 = 2h 30m
 *   - :5 = 0h 5m
 *   - :30 = 0h 30m
 *   - 2.50 = 2h 30m
 *   - .5 = 0h 30m
 *
 * @param {string} hhmm
 */
T2RDuration.prototype.setHHMM = function (hhmm) {
  var parts = null;

  // Parse hh only. Ex: 2 = 2h 00m.
  var pattern = /^(\d{0,2})$/;
  if (hhmm.match(pattern)) {
    var parts = hhmm.match(pattern).slice(-1);
    parts.push('00');
  }

  // Parse hh:mm duration. Ex: 2:30 = 2h 30m.
  var pattern = /^(\d{0,2}):(\d{0,2})$/;
  if (hhmm.match(pattern)) {
    parts = hhmm.match(pattern).slice(-2);
    // Minutes must have 2 digits.
    if (parts[1].length < 2) {
      parts = null;
    }
    // Minutes cannot exceed 59 in this format.
    else if (parts[1] > 59) {
      parts = null;
    }
  }

  // Parse hh.mm as decimal. Ex: 2.5 = 2h 30m.
  var pattern = /^(\d{0,2})\.(\d{0,2})$/;
  if (!parts && hhmm.match(pattern)) {
    parts = hhmm.match(pattern).slice(-2);
    // Compute minutes.
    parts[1] = (60 * parts[1]) / Math.pow(10, parts[1].length);
    parts[1] = Math.round(parts[1]);
  }

  // No pattern matched? Throw error.
  if (!parts || parts.length !== 2) {
    throw 'Error: ' + hhmm + ' is not in hh:mm format.';
  }

  // Validate hours and minutes.
  parts[0] = (parts[0].length == 0) ? 0 : parseInt(parts[0]);
  parts[1] = (parts[1].length == 0) ? 0 : parseInt(parts[1]);
  if (isNaN(parts[0]) || isNaN(parts[1])) {
    throw 'Error: ' + hhmm + ' is not in hh:mm format.';
  }

  // Convert time to seconds and set the number of seconds.
  var secs = parts[0] * 60 * 60 + parts[1] * 60;
  this.setSeconds(secs);
};

/**
 * Gets the "hours" part of the duration.
 *
 * @param {boolean} force2
 *   Whether to force 2 digits.
 *
 * @return {integer|string}
 *   Hours in the duration.
 */
T2RDuration.prototype.getHours = function (force2) {
  force2 = force2 || false;
  var output = this.__hours;
  if (force2) {
    output = ('00' + output).substr(-2);
  }
  return output;
};

/**
 * Gets the "minutes" part of the duration.
 *
 * @param {boolean} force2
 *   Whether to force 2 digits.
 *
 * @return {integer|string}
 *   Minutes in the duration.
 */
T2RDuration.prototype.getMinutes = function (force2) {
  force2 = force2 || false;
  var output = this.__minutes;
  if (force2) {
    output = ('00' + output).substr(-2);
  }
  return output;
};

/**
 * Gets the duration as hours and minutes.
 *
 * @return string
 *   Time in hh:mm format.
 */
T2RDuration.prototype.asHHMM = function () {
  return this.getHours(true) + ':' + this.getMinutes(true);
};

/**
 * Gets the duration as hours in decimals.
 *
 * @param {boolean} ignoreSeconds
 *   Round down to the nearest full-minute.
 *
 *   Ex: 90 seconds is treated 60 seconds.
 *
 * @return string
 *   Time in hours (decimal). Ex: 1.5 for 1 hr 30 min.
 */
T2RDuration.prototype.asDecimal = function (ignoreSeconds) {
  var output = this.getSeconds(ignoreSeconds) / 3600;
  // Convert to hours. Ex: 0h 25m becomes 0.416.
  // Since toFixed rounds off the last digit, we ignore it.
  output = output.toFixed(3);
  output = output.substr(0, output.length - 1);
  return output;
};

/**
 * Add a duration.
 *
 * @param {*} duration
 */
T2RDuration.prototype.add = function (duration) {
  var oDuration = ('object' === typeof duration)
    ? duration : new T2RDuration(duration);
  var seconds = this.getSeconds() + oDuration.getSeconds();
  this.setSeconds(seconds);
};

/**
 * Subtract a duration.
 *
 * @param {*} duration
 */
T2RDuration.prototype.sub = function (duration) {
  var oDuration = ('object' === typeof duration)
    ? duration : new T2RDuration(duration);
  var seconds = this.getSeconds() - oDuration.getSeconds();
  // Duration cannot be negative.
  seconds = (seconds >= 0) ? seconds : 0;
  this.setSeconds(seconds);
};

/**
 * Rounds to the nearest minutes.
 *
 * @param {*} minutes
 *   Number of minutes to round to. Ex: 5, 10 or 15.
 * @param {string} direction
 *   One of T2R.ROUND_* constants.
 */
T2RDuration.prototype.roundTo = function (minutes, direction) {
  // Determine the rounding value.
  minutes = 'undefined' === typeof minutes ? 0 : minutes;
  minutes = parseInt(minutes);
  minutes = isNaN(minutes) ? 0 : minutes;

  // Do nothing if rounding value is zero.
  if (0 === minutes) {
    return;
  }

  // Compute the rounding value as seconds.
  var seconds = minutes * 60;

  // Determine the amount of correction required.
  var correction = this.getSeconds(true) % seconds;

  // Do nothing if no correction / rounding is required.
  if (correction === 0) {
    return;
  }

  // Round according to rounding direction.
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

/**
 * Toggl 2 Redmine widget manager.
 */
var T2RWidget = {};

/**
 * Initializes all widgets in the given element.
 *
 * @param {Object} el
 */
T2RWidget.initialize = function (el) {
  el = ('undefined' === typeof el) ? document.body : el;
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
          T2R.flash('Deletion failed.', 'error');
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
        new T2RDuration(val);
        el.setCustomValidity('');
      } catch (e) {
        el.setCustomValidity(e);
      }
    })
    // Update totals as the user updates hours.
    .bind('input', T2R.updateTogglTotals)
    .bind('keyup', function (e) {
      var $input = $(this);

      // Detect current duration.
      try {
        var duration = new T2RDuration();
        duration.setHHMM($input.val());
      } catch(e) {
        return;
      }

      // Round to the nearest 5 minutes or 15 minutes.
      var minutes = duration.getMinutes();
      var step = e.shiftKey ? 15 : 5;

      // On "Up" press.
      if (e.key === 'ArrowUp') {
        var delta = step - (minutes % step);
        duration.add(delta * 60);
      }
      // On "Down" press.
      else if (e.key === 'ArrowDown') {
        var delta = (minutes % step) || step;
        duration.sub(delta * 60);
      }
      // Do nothing.
      else {
        return;
      }

      // Update value in the input field.
      $(this).val(duration.asHHMM()).trigger('input').select();
    })
    .bind('change', function () {
      var $input = $(this);
      var value = '';
      // Determine the visible value.
      try {
        var duration = new T2RDuration();
        duration.setHHMM($input.val());
        value = duration.asHHMM();
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
    // Prepare placeholder.
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

T2RWidget.initDurationRoundingDirection = function (el) {
  var $el = $(el);

  // Prepare rounding options.
  var options = {};
  options[T2RDuration.ROUND_REGULAR] = 'Round off';
  options[T2RDuration.ROUND_UP] = 'Round up';
  options[T2RDuration.ROUND_DOWN] = 'Round down';

  // Generate a SELECT element and use it's options.
  var $select = T2RRenderer.render('Dropdown', {
    placeholder: 'Don\'t round',
    options: options
  });

  $el.append($select.find('option'));
};

/**
 * Toggl 2 Redmine Logger.
 */
var T2RConsole = {};

/**
 * Enable or disable verbose mode.
 *
 * @type {boolean} status
 *   True to enable or false to disable.
 */
T2RConsole.setVerboseMode = function (status) {
  T2R.browserStorage('t2r.debug', status == true);
};

/**
 * Enable or disable verbose mode.
 *
 * @return {boolean}
 *   True if enabled, false otherwise.
 */
T2RConsole.getVerboseMode = function () {
  return T2R.browserStorage('t2r.debug' || false);
};

/**
 * Initializes T2RConsole.
 */
T2RConsole.initialize = function () {
  if (T2RConsole.getVerboseMode()) {
    console.log('Verbose logging is enabled for the Toggl 2 Redmine plugin.');
  }
  console.log('Use "T2RConsole.setVerboseMode()" to enable / disable verbose logging.');
};

/**
 * Equivalent to console.clear().
 */
T2RConsole.clear = function () {
  console.clear();
}

/**
 * Creates a separator between log messages.
 */
T2RConsole.separator = function () {
  this.log('------');
}

/**
 * Equivalent to console.group().
 */
T2RConsole.group = function (label, collapsed) {
  collapsed = collapsed || false;
  if (T2RConsole.getVerboseMode()) {
    collapsed ? console.groupCollapsed(label) : console.group(label);
  }
};

/**
 * Equivalent to console.groupEnd().
 */
T2RConsole.groupEnd = function () {
  if (T2RConsole.getVerboseMode()) {
    console.groupEnd();
  }
};

/**
 * Equivalent to console.log().
 *
 * @param {string} message
 *   A message.
 * @param {*} args
 *   Data, if any.
 */
T2RConsole.log = function (message, args) {
  if (T2RConsole.getVerboseMode()) {
    if ('undefined' === typeof args) {
      console.log(message);
    }
    else {
      console.log(message, args);
    }
  }
};

/**
 * Equivalent to console.error().
 *
 * @param {string} message
 *   A message.
 * @param {*} args
 *   Data, if any.
 */
T2RConsole.error = function (message, args) {
  if ('undefined' === typeof args) {
    console.error(message);
  }
  else {
    console.error(message, args);
  }
};

/**
 * Equivalent to console.warn().
 *
 * @param {string} message
 *   A message.
 * @param {*} args
 *   Data, if any.
 */
T2RConsole.warn = function (message, args) {
  if ('undefined' === typeof args) {
    console.warn(message);
  }
  else {
    console.warn(message, args);
  }
};

/**
 * Toggl 2 Redmine Renderer.
 */
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

T2RRenderer.renderRedmineIssueLabel = function (data) {
  // If the issue is invalid, do nothing.
  var issue = data;
  if (!issue || !issue.id) {
    return false;
  }

  // Render a clickable issue label.
  var markup = '<a href="' + T2R.redmineIssueURL(issue.id) + '" target="_blank">'
    + T2R.htmlEntityEncode(issue ? issue.tracker.name : '-')
    + T2R.htmlEntityEncode(issue ? ' #' + issue.id : '')
    + T2R.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
  + '</a>';
  return markup;
};

T2RRenderer.renderTogglRow = function (data) {
  var issue = data.issue || false;
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
      + '<input data-property="issue_id" type="hidden" data-value="' + T2R.htmlEntityEncode(issue ? issue.id : '') + '" value="' + issue.id + '" />'
      + '<strong>' + T2R.htmlEntityEncode(issue ? issue.project.name : 'Unknown') + '</strong>'
      + '<br />'
      + issueLabel
    + '</td>'
    + '<td class="comments"><input data-property="comments" type="text" value="' + T2R.htmlEntityEncode(data.comments) + '" maxlength="255" /></td>'
    + '<td class="activity">'
      + '<select data-property="activity_id" required="required" placeholder="-" data-t2r-widget="RedmineActivityDropdown" data-selected="' + T2R.browserStorage('t2r.default-activity') + '"></select>'
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

T2RRenderer.renderRedmineRow = function (data) {
  var issue = data.issue.id ? data.issue : false;

  // Prepare edit action.
  var urlEdit = T2R.REDMINE_URL + '/time_entries/' + data.id + '/edit';
  var linkEdit = '<a href="' + urlEdit + '" title="Edit" class="icon-only icon-edit" target="_blank" data-t2r-widget="Tooltip">Edit</a>'

  // Prepare delete action.
  var urlDelete = T2R.REDMINE_URL + '/time_entries/' + data.id;
  var linkDelete = '<a href="' + urlDelete + '" title="Delete" class="icon-only icon-del" rel="nofollow" data-t2r-widget="AjaxDeleteLink Tooltip" data-t2r-delete-link-context="tr" data-t2r-delete-link-callback="T2R.updateRedmineReport();">Delete</a>'

  // Build a label for the issue.
  var issueLabel = issue ? T2RRenderer.render('RedmineIssueLabel', issue) : '-';

  var markup = '<tr>'
    + '<td class="subject">'
      + '<strong>' + T2R.htmlEntityEncode(data.project.name || 'Unknown') + '</strong>'
      + '<br />'
      + issueLabel
    + '</td>'
    + '<td class="comments">' + T2R.htmlEntityEncode(data.comments) + '</td>'
    + '<td class="activity">' + T2R.htmlEntityEncode(data.activity.name) + '</td>'
    + '<td class="hours">' + T2RRenderer.render('Duration', data.duration) + '</td>'
    + '<td class="buttons">'
      + linkEdit
      + linkDelete
    + '</td>'
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
T2RRenderer.renderStatusLabel = function (data) {
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
 * @returns {Object}
 *   Rendered output.
 */
T2RRenderer.render = function (template, data) {
  var method = 'render' + template;
  if ('undefined' == typeof T2RRenderer) {
    throw 'Error: To render "' + template + '" please define "T2RRenderer.' + method;
  }
  return T2RRenderer[method](data);
};

/**
 * Init script.
 */
$(document).ready(function() {
  T2R.initialize();
});
