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
  var output = null;

  // Set data.
  if (2 === arguments.length) {
    T2R.storageData[key] = value;
    output = value;
  }
  // Get data.
  else {
    if ('undefined' !== typeof T2R.storageData[key]) {
      output = T2R.storageData[key];
    }
  }

  return output;
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
    if ('undefined' !== window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return value;
  }
  else {
    return ('undefined' !== window.localStorage)
      ? window.localStorage.getItem(key) : value;
  }
};

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
  var $form = $('#filter-form');

  // Initialize apply filters button.
  $form.find('#btn-apply-filters').click(function () {
    $form.submit();
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
  $form.submit(T2R.handleFilterForm);

  // Hide workspace filter if there is only one Toggl workspace.
  var $workspace = $form.find('#toggl-workspace');
  if ($workspace.find('option').length <= 2) {
    $workspace.closest('tr').hide();
  }

  // Reset the form to set default values.
  T2R.resetFilterForm();
};

/**
 * Filter form resetter.
 */
T2R.resetFilterForm = function () {
  var $form = $('#filter-form');

  // Mark all inputs as empty.
  $form.find(':input').val('');

  // Populate current date on date fields.
  $form.find('#date').each(function() {
    var date = T2R.dateFormatYYYYMMDD();
    this.value = date.substr(0, 10);
  });

  // Populate default activity from browser storage.
  $form.find('#default-activity').val(T2R.browserStorage('t2r.default-activity'));

  $form.submit();
};

/**
 * Filter form submission handler.
 */
T2R.handleFilterForm = function() {
  T2R.storage('date', $('input#date').val());
  T2R.storage('default-activity', $('select#default-activity').val());
  T2R.storage('toggl-workspace', $('select#toggl-workspace').val());

  // Store default activity to browser storage.
  T2R.browserStorage('t2r.default-activity', T2R.storage('default-activity'));

  // Show date in the headings.
  var sDate = T2R.storage('date');
  var oDate = T2R.dateStringToObject(sDate + ' 00:00:00');
  $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');

  // Update both the Redmine and Toggl reports.
  setTimeout(function() {
    T2R.updateRedmineReport();
    T2R.updateTogglReport();
  }, 250);

  // Unlock the publish form if it was previously locked.
  T2R.unlockPublishForm();

  return false;
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
    try {
      var duration = new T2RDuration();
      duration.setHHMM(durationInput);
      redmine_entry.hours = duration.asHHMM();
    } catch (e) {
      T2RConsole.log('Invalid duration. Ignoring entry.', redmine_entry);
      return;
    }

    // Finalize POST data.
    var data = {
      time_entry: redmine_entry,
      toggl_ids: toggl_entry.ids
    };

    // Push the data to Redmine.
    T2R.redmineRequest({
      async: false,
      url: '/toggl2redmine/import',
      method: 'post',
      context: $tr,
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: function(data, status, xhr) {
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

  // Refresh the Redmine report and show success message.
  T2R.unlockPublishForm();
  T2R.updateRedmineReport();
  T2R.updateLastImported();
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
    string = Date.parse(string);
    return new Date(string);
  }
  catch (e) {
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
 * Sends an AJAX request to Toggl with the given options.
 *
 * Automatically injects auth headers.
 *
 * @param opts
 *   Request options.
 */
T2R.togglRequest = function (opts) {
  opts = opts || {};

  // Prepare Toggl API location.
  opts.url = 'https://www.toggl.com' + opts.url;

  // Add auth headers.
  opts.headers = opts.headers || {};
  $.extend(opts.headers, T2R.getBasicAuthHeader(T2R.TOGGL_API_KEY, 'api_token'));

  $.ajax(opts);
};

/**
 * Gets all workspaces from Toggl.
 *
 * @param {Object} opts
 */
T2R.getTogglWorkspaces = function (opts) {
  var key = 'toggl.workspaces';
  if (!T2R.cache(key)) {
    var output = {};
    T2R.togglRequest({
      async: false,
      url: '/api/v8/workspaces',
      success: function(data, status, xhr) {
        output = data;
      },
      error: function (xhr, textStatus) {
        T2R.flash('Could not fetch Toggl Workspaces. Please refresh the page to try again.', 'error');
      }
    });
    if (output) {
      T2R.cache(key, output);
    }
  }
  return T2R.cache(key);
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
      url: '/toggl2redmine/toggl_time_entries',
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
    for (var key in entries) {
      var entry = entries[key];
      entry.errors = entry.errors || [];

      // If there is no issue ID associated to the entry.
      if (!entry.issue_id) {
        entry.errors.push('Could not determine issue ID. Please mention the Redmine issue ID in your Toggl task description. Example: "#1919 Feed the bunny wabbit"');
      }

      // If an issue ID exists, but no issue could be found.
      if (entry.issue_id && !entry.issue) {
        entry.errors.push('Issue not found on Redmine. Make sure you\'re using a correct issue ID.');
      }

      // Include the entry in the output.
      output.push(entry);
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

  var date = T2R.storage('date');
  var opts = {
    from: date + ' 00:00:00',
    till: date + ' 23:59:59',
    workspace: T2R.storage('toggl-workspace') || false
  };

  // Fetch time entries from Toggl.
  T2R.getTogglTimeEntries(opts, function (entries) {
    var $table = T2R.getTogglTable();

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

    // Pre-select default activities.
    var defaultActivity = T2R.storage('default-activity');
    if (defaultActivity) {
      $table.find('tbody [data-property="activity_id"]').each(function() {
        var $select = $(this);
        // Populate default value if no value is set.
        if ('' === $select.val()) {
          $select.val(defaultActivity);
        }
      });
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

    // Uncheck the "check all" checkbox.
    var $checkAll = $table.find('.check-all')
      .prop('checked', false);
    // If the update was triggered from the filter form, then focus the
    // "check-all" button to allow keyboard navigation.
    if (T2R.getFilterForm().has(':focus').length > 0) {
      $checkAll.focus();
    }
  });
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
      url: '/toggl2redmine/redmine_time_entries',
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
  var query = {
    from: from.toISOString().split('T')[0] + 'T00:00:00Z',
    till: till.toISOString().split('T')[0] + 'T00:00:00Z'
  };
  T2R.getRedmineTimeEntries(query, function (entries) {
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
  T2R.redmineRequest({
    url: '/time_entries.json',
    data: {
      user_id: 'me',
      limit: 1
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
 * @returns {Object}
 *   Activities indexed by ID.
 */
T2R.getRedmineActivities = function () {
  var key = 'redmine.activities';
  if (!T2R.cache(key)) {
    T2R.redmineRequest({
      async: false,
      url: '/enumerations/time_entry_activities.json',
      success: function (data, status, xhr) {
        T2R.cache(key, data.time_entry_activities);
      },
      error: function (xhr, textStatus) {
        T2R.cache(key, []);
      }
    });
  }
  return T2R.cache(key);
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
  opts.url = T2R.REDMINE_URL + opts.url;

  // TODO: Use CSRF Token instead of API Key?
  // For some reason Redmine throws 401 Unauthroized despite a CSRF Token.
  opts.headers = opts.headers || {};
  opts.headers['X-Redmine-API-Key'] = T2R.REDMINE_API_KEY;
  $.ajax(opts);
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
 * Duration constructor.
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
  // Not a valid format, throw error.
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
  this.__seconds = parseInt(seconds);
  this.__minutes = Math.ceil(this.__seconds / 60);
  this.__hours = Math.floor(this.__minutes / 60);
  this.__minutes = this.__minutes % 60;
};

/**
 * Gets duration as seconds.
 *
 * @return {integer}
 *   Duration in seconds.
 */
T2RDuration.prototype.getSeconds = function () {
  return this.__seconds;
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

  // Parse hh:mm as decimal. Ex: 2:30 = 2h 30m.
  var pattern = /^(\d{0,2}):(\d{0,2})$/;
  if (hhmm.match(pattern)) {
    parts = hhmm.match(pattern).slice(-2);
    // Minutes must have 2 digits.
    if (parts[1].length < 2) {
      parts = null;
    }
    // Minutes cannot exceed 59 in this format.
    if (parts[1] > 59) {
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
    var widget = $el.attr('data-t2r-widget');
    var widgetClass = 't2r-widget-' + widget;
    // Initialize the widget, if required.
    if (!$el.hasClass(widgetClass)) {
      var method = 'init' + widget;
      if ('undefined' !== typeof T2RWidget[method]) {
        T2RWidget[method](el);
        $el.addClass(widgetClass);
      }
      else {
        throw 'Error: To initialize "' + widget + '" please define "T2RWidget.' + method;
      }
    }
  });
};

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

  // If hours change, update totals.
  $el.find('[data-property="hours"]')
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
    // Update totals as the user updates hours.
    .bind('input', T2R.updateTogglTotals)
    // When the value changes, display the way the value will be treated.
    .bind('change', function () {
      var $input = $(this);
      var value = '';
      try {
        var duration = new T2RDuration();
        duration.setHHMM($input.val());
        value = duration.asHHMM();
      } catch(e) {}
      // Update the visible value and the totals.
      $input.val(value);
      T2R.updateTogglTotals();
    });

  // Initialize tooltips for all inputs.
  $el.find(':input').tooltip();
};

T2RWidget.initDurationInput = function (el) {
  var $el = $(el);

  // Bind input listeners for constant validation.
  $el.bind('input', function() {
    var val = $el.val();
    try {
      var duration = new T2RDuration(val);
      el.setCustomValidity('');
    } catch (e) {
      el.setCustomValidity(e);
    }
  });
};

T2RWidget.initRedmineActivityDropdown = function (el) {
  var $el = $(el);
  var activities = T2R.getRedmineActivities();
  var options = [];

  // Determine placeholder.
  var placeholder = $el.attr('placeholder');
  if ('undefined' !== typeof placeholder) {
    options.push('<option value="">' + placeholder + '</option>');
  }

  // Prepare and insert options.
  for (var i in activities) {
    var activity = activities[i];
    options.push('<option value="' + activity.id + '">' + activity.name + '</option>');
  }
  $el.html(options.join(''));

  // Mark selection.
  var value = $el.attr('data-selected');
  if ('undefined' !== typeof value) {
    $el.val(value);
  }
};

T2RWidget.initTogglWorkspaceDropdown = function (el) {
  var $el = $(el);
  var workspaces = T2R.getTogglWorkspaces();
  var options = [];

  // Determine placeholder.
  var placeholder = $el.attr('placeholder');
  if ('undefined' !== typeof placeholder) {
    options.push('<option value="">' + placeholder + '</option>');
  }

  // Prepare and insert options.
  for (var i in workspaces) {
    var workspace = workspaces[i];
    options.push('<option value="' + workspace.id + '">' + workspace.name + '</option>');
  }
  $el.html(options.join(''));

  // Mark selection.
  var value = $el.attr('data-selected');
  if ('undefined' !== typeof value) {
    $el.val(value);
  }
};

/**
 * Toggl 2 Redmine Logger.
 */
var T2RConsole = {};

/**
 * Whether to show debugging messages.
 */
T2RConsole.debug = false;

/**
 * Logs a debugging message.
 *
 * @param {string} message
 *   A message.
 */
T2RConsole.log = function (message) {
  if (this.debug) {
    console.log(message);
  }
};

/**
 * Logs an error message.
 *
 * @param {string} message
 *   A message.
 */
T2RConsole.error = function (message) {
  setTimeout(function () {
    throw(message);
  }, 0);
};

/**
 * Logs a warning message.
 *
 * @param {string} message
 *   A message.
 */
T2RConsole.warn = function (message) {
  console.warn(message);
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
  return $('<div />').append($el).html();
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
  var project = data.project || false;
  var issueUrl = issue ? T2R.redmineIssueURL(issue.id) : '#';
  var duration = new T2RDuration(data.duration);

  // Build a label for the issue.
  var issueLabel = issue ? T2RRenderer.render('RedmineIssueLabel', issue) : false;
  if (!issueLabel) {
    issueLabel = data.issue_id || '-';
  }

  var markup = '<tr data-t2r-widget="TogglRow">'
    + '<td class="checkbox"><input class="cb-import" type="checkbox" value="1" title="Check this box if you want to import this entry." /></td>'
    + '<td class="status"></td>'
    + '<td class="project">'
      + T2R.htmlEntityEncode(issue ? issue.project.name : '-')
    + '</td>'
    + '<td class="issue">'
      + '<input data-property="issue_id" type="hidden" data-value="' + T2R.htmlEntityEncode(issue ? issue.id : '') + '" value="' + issue.id + '" />'
      + issueLabel
    + '</td>'
    + '<td class="comments"><input data-property="comments" type="text" value="' + T2R.htmlEntityEncode(data.comments) + '" maxlength="255" /></td>'
    + '<td class="activity">'
      + '<select data-property="activity_id" required="required" placeholder="-" data-t2r-widget="RedmineActivityDropdown" data-selected="' + T2R.storage('default-activity') + '"></select>'
    + '</td>'
    + '<td class="hours">'
      + '<input data-property="hours" required="required" data-t2r-widget="DurationInput" type="text" title="Example: 1:50 means 1 hour 50 minutes. Press \'Up\' or \'Down\' to round to the nearest 5 minutes. Combine with \'Shift\' to round to the nearest 15 minutes." value="' + duration.asHHMM() + '" size="6" maxlength="5" />'
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
  var issueUrl = issue ? T2R.redmineIssueURL(issue.id) : '#';
  var entryUrl = T2R.REDMINE_URL + '/time_entries/' + data.id + '/edit';

  // Build a label for the issue.
  var issueLabel = issue ? T2RRenderer.render('RedmineIssueLabel', issue) : false;
  if (!issueLabel) {
    issueLabel = data.issueId ? data.issueId : '-';
  }

  var markup = '<tr>'
    + '<td class="id">'
      + T2R.htmlEntityEncode(data.project.name || 'Unknown')
    + '</td>'
    + '<td class="subject">' + issueLabel + '</td>'
    + '<td class="comments">' + T2R.htmlEntityEncode(data.comments) + '</td>'
    + '<td class="activity">' + T2R.htmlEntityEncode(data.activity.name) + '</td>'
    + '<td class="hours">' + T2RRenderer.render('Duration', data.duration) + '</td>'
    + '<td class="buttons">'
      + '<a href="' + entryUrl + '" title="Edit" class="icon-only icon-edit" target="_blank">Edit</a>'
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

  // Initialize tooltips.
  $tr.find('[title]').tooltip();

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
