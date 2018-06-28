'use strict';

/**
 * Toggl 2 Redmine Helper.
 */
var T2RHelper = {};

/**
 * TODO: Fetch Redmine base URL as per installation.
 */
T2RHelper.REDMINE_URL = '';

T2RHelper.cacheData = {};

T2RHelper.initialize = function () {
  T2RHelper.initConfigForm();
  T2RHelper.initPublishForm();
};

T2RHelper.cache = function (key, value = null) {
  if (2 === arguments.length) {
    T2RHelper.cacheData[key] = value;
    return value;
  }
  else {
    return ('undefined' === typeof T2RHelper.cacheData[key])
      ? null : T2RHelper.cacheData[key];
  }
};

T2RHelper.initConfigForm = function() {
  // Populate current date on date fields.
  $('#config-form #date').each(function() {
    var date = new Date();
    date = date.toISOString();
    this.value = date.substr(0, 10);
  });

  // Populate stored config.
  $('#toggl-api-key').val(T2RConfig.get('toggl.key'));

  // Handle config form submission.
  $('#config-form').submit(T2RHelper.handleConfigForm).trigger('submit');
};

T2RHelper.handleConfigForm = function() {
  T2RConfig.set('toggl.key', $('#toggl-api-key').val());
  T2RConfig.set('date', $('input#date').val());
  setTimeout(T2RHelper.updateTogglReport, 100);
  setTimeout(T2RHelper.updateRedmineReport, 100);
  return false;
};

T2RHelper.initPublishForm = function () {
  // Handle data submission to Redmine.
  $('#publish-form').submit(T2RHelper.handlePublishForm);
};

T2RHelper.handlePublishForm = function() {
  setTimeout(T2RHelper.publishToRedmine);
  return false;
};

T2RHelper.publishToRedmine = function () {
  $('#btn-publish').attr('disabled', 'disabled');
  $('#toggl-report tbody tr').each(function () {
    var $tr = $(this);

    // If the item is not marked for export, ignore it.
    if (!$tr.find('[data-property="export"]').prop('checked')) {
      return;
    }

    // Prepare the data to be pushed to Redmine.
    var entry = {
      spent_on: T2RConfig.get('date'),
      issue_id: $tr.find('[data-property="issue_id"]').val(),
      comments: $tr.find('[data-property="comments"]').val(),
      activity_id: $tr.find('[data-property="activity_id"]').val(),
      hours: $tr.find('[data-property="hours"]').val(),
      user_id: 1
    };

    // Push the data to Redmine.
    // I think I'm writing too many comments!
    T2RHelper.redmineRequest({
      url: '/time_entries.json',
      method: 'post',
      data: {
        time_entry: entry
      },
      dataType: 'json',
      success: function(data, status, xhr) {
        $tr.addClass('ui-state-success');
      },
      error: function(data, status, xhr) {
        console.log("Error: Couldn't log '" + entry.issue_id + ': ' + entry.comments + "'");
      }
    });
  });

  // Todo: Refresh the Redmine and the Toggl reports.
  alert('Yay! The selected time entries were posted to Redmine!');
};

T2RHelper.updateTogglReport = function () {
  var opts = T2RHelper.getTimeRange();
  var entries = T2RHelper.getNormalizedTogglTimeEntries(opts);

  // Render the entries on the table.
  var $table = $('#toggl-report');
  $table.find('tbody').html('');

  // Display entries eligible for export.
  for (var key in entries) {
    var entry = entries[key];
    if (!entry.issueId) {
      continue;
    }
    var markup = T2RRenderer.render('TogglRow', entry);
    $table.find('tbody').append(markup);
  }

  // Display entries not eligible for export.
  for (var key in entries) {
    var entry = entries[key];
    if (entry.issueId) {
      continue;
    }
    var markup = T2RRenderer.render('TogglRow', entry);
    $table.find('tbody').append(markup);
  }

  // Display empty table message, if required.
  if (0 === entries.length) {
    var markup = '<tr><td colspan="' + $table.find('thead tr:first th').length + '">'
        + 'There are no items to display here. Did you log your time on Toggl?'
      + '</td></tr>';
    $table.find('tbody').append(markup);
  }
};

T2RHelper.getTimeRange = function () {
  var date = T2RConfig.get('date');
  return {
    from: date + ' 00:00:00',
    till: date + ' 23:59:59'
  };
};

T2RHelper.getTogglAuthHeaders = function (username, password) {
  var userpass = T2RConfig.get('toggl.key') + ':' + 'api_token';
  var output = {
    Authorization: 'Basic ' + btoa(userpass)
  };
  return output;
};

T2RHelper.dateStringToObject = function (string) {
  try {
    string = Date.parse(string);
    var object = new Date(string);
    return object;
  }
  catch (e) {
    return false;
  }
};

T2RHelper.getTogglTimeEntries = function (opts) {
  opts = opts || {};

  opts.start_date = T2RHelper.dateStringToObject(opts.from);
  if (!opts.start_date) {
    alert('Error: Invalid start date!');
    return false;
  }
  opts.start_date = opts.start_date.toISOString();

  opts.end_date = T2RHelper.dateStringToObject(opts.till);
  if (!opts.end_date) {
    alert('Error: Invalid end date!');
    return false;
  }
  opts.end_date = opts.end_date.toISOString();

  var headers = T2RHelper.getTogglAuthHeaders();
  var output = false;
  $.ajax({
    async: false,
    url: 'https://www.toggl.com/api/v8/time_entries',
    data: opts,
    headers: headers,
    success: function(data, status, xhr) {
      output = data;
    }
  });

  return output;
};

T2RHelper.getNormalizedTogglTimeEntries = function (opts) {
  opts = opts || {};

  var entries = T2RHelper.getTogglTimeEntries(opts);
  var output = {};
  var issueIds = [];

  for (var i in entries) {
    var record = {
      duration: 0,
      // Todo: Track original Toggl ID.
      togglEntryId: [],
      togglEntry: []
    };
    var entry = entries[i];

    var match = entry.description.match(/^.*#(\d+) (.*)$/);
    if (match) {
      record.issueId = parseInt(match[1]);
      record.comments = match[2];
    }
    else {
      record.issueId = false;
      record.comments = entry.description;
    }

    // Unique key for the record.
    record.key = record.issueId + ':' + record.comments;
    record.duration = entry.duration;

    // Ignore active timers.
    if (record.duration < 0) {
      console.log('The active time entry was skipped.');
      continue;
    }

    // Collect this issue ID.
    if (record.issueId && issueIds.indexOf(record.issueId) < 0) {
      issueIds.push(record.issueId);
    }

    // Create record if not exists.
    if ('undefined' === typeof output[record.key]) {
      output[record.key] = record;
    }
    // Update record if exists.
    else {
      output[record.key].duration += record.duration;
    }
  }

  // Add issue subjects to all entries.
  var issues = T2RHelper.getRedmineIssues(issueIds);
  for (var i in output) {
    var record = output[i];
    if (record.issueId !== false && 'undefined' !== typeof issues[record.issueId]) {
      var issue = issues[record.issueId];
      record.subject = issue ? issue.subject : '-';
    }
    else {
      record.subject = '-';
    }
  }

  return output;
};

T2RHelper.getRedmineTimeEntries = function (opts) {
  return;
  opts = opts || {};
  var output = T2RHelper.redmineRequest({
    async: false,
    url: '/time_entries.json',
    data: {
      spent_on: opts.from + '|' + opts.till
    },
    success: function (data, status, xhr) {
      console.log(data);
    }
  });
};

T2RHelper.updateRedmineReport = function () {
  var opts = T2RHelper.getTimeRange();
  var entries = T2RHelper.getRedmineTimeEntries(opts);
};

T2RHelper.getRedmineActivities = function () {
  var key = 'redmine.activities';
  if (!T2RHelper.cache(key)) {
    T2RHelper.redmineRequest({
      async: false,
      url: '/enumerations/time_entry_activities.json',
      success: function (data, status, xhr) {
        T2RHelper.cache(key, data.time_entry_activities);
      },
      error: function (data, status, xhr) {
        T2RHelper.cache(key, []);
      }
    });
  }
  return T2RHelper.cache(key);
};

T2RHelper.getRedmineIssue = function (id) {
  var output = T2RHelper.getRedmineIssues([id]);
  return ('undefined' == typeof output[id]) ? false : output[id];
}

T2RHelper.getRedmineIssues = function (ids) {
  var output = {};
  // Do nothing if no IDs are sent.
  if (0 === ids.length) {
    return output;
  }
  // Fetch issue info and key them by issue ID.
  try {
    T2RHelper.redmineRequest({
      async: false,
      cache: true,
      timeout: 1000,
      url: '/issues.json',
      data: {
        issue_id: ids.join(',')
      },
      success: function (data, status, xhr) {
        var issues = ('undefined' === data.issues) ? [] : data.issues;
        for (var i in issues) {
          var issue = issues[i];
          output[issue.id] = issue;
        }
      },
      error: function (data, status, xhr) {}
    });
  } catch(e) {
    console.log('Error: ' + e);
  }
  return output;
};

T2RHelper.redmineRequest = function (opts) {
  opts.timeout = opts.timeout || 3000;
  opts.url = T2RHelper.REDMINE_URL + opts.url;
  opts.headers = {
    // 'X-Redmine-API-Key': 'redmine-api-key-goes-here'
  };
  $.ajax(opts);
};

/**
 * Ter Config.
 *
 * TODO: Manage config on server side and manage date as a filter.
 */
var T2RConfig = {};

T2RConfig.data = {};

T2RConfig.get = function (key) {
  key = 'ter.' + key;
  var output = null;
  if (typeof Storage !== 'undefined') {
    output = localStorage.getItem(key);
  }
  else if ('undefined' != typeof T2RConfig.data[key]) {
    output = T2RConfig.data[key];
  }
  return output;
};

T2RConfig.set = function (key, value) {
  key = 'ter.' + key;
  if (typeof Storage !== 'undefined') {
    localStorage.setItem(key, value);
  }
  else {
    T2RConfig.data[key] = value;
  }
  return value;
};



/**
 * Toggl em Red Renderer.
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

T2RRenderer.renderRedmineActivityDropdown = function (data) {
  data = data || {};
  data.options = {};
  var activities = T2RHelper.getRedmineActivities();
  for (var i in activities) {
    var activity = activities[i];
    data.options[activity.id] = activity.name;
  }
  return T2RRenderer.render('Dropdown', data);
};

T2RRenderer.renderDuration = function (data) {
  data = Math.ceil(data / 60);
  var h = Math.floor(data / 60);
  var output = h;
  var m = data % 60;
  output += ':' + ('00' + m).substr(-2);
  return output;
};

T2RRenderer.renderTogglRow = function (data) {
  var issueUrl = data.issueId ? '/issue/' + data.issueId : '#';
  var markup = '<tr>'
    + '<td class="checkbox"><input data-property="export" type="checkbox" value="1" /></td>'
    + '<td class="id">'
      + '<input data-property="issue_id" type="hidden" value="' + data.issueId + '" />'
      + (data.issueId ? '<a href="' + issueUrl + '" target="_blank">' + data.issueId + '</a>' : '-')
    + '</td>'
    + '<td class="project">-</td>'
    + '<td class="subject">' + data.subject + '</td>'
    + '<td class="comments"><input data-property="comments" type="text" value="' + data.comments + '" maxlength="255" /></td>'
    + '<td class="activity">' + T2RRenderer.render('RedmineActivityDropdown', {
      placeholder: '-',
      attributes: {
        'data-property': 'activity_id',
        'required': 'required'
      }
    }) + '</td>'
    + '<td class="hours"><input data-property="hours" type="hidden" value="' + (data.duration / 3600) + '" maxlength="5" />' + T2RRenderer.render('Duration', data.duration) + '</td>'
    + '</tr>';
  var $tr = $(markup);
  if (!data.issueId) {
    $tr.addClass('error');
    $tr.find(':input').attr({
      'disabled': 'disabled'
    });
  }
  return $('<div />').append($tr).html();
};

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
$(document.body).ready(function() {
  T2RHelper.initialize();
});
