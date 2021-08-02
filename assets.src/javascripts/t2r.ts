// @ts-nocheck

declare const T2R_REDMINE_API_KEY: string;
declare const T2R_REDMINE_REPORT_URL_FORMAT : string;
declare const T2R_TOGGL_REPORT_URL_FORMAT: string;

import {LocalStorage, TemporaryStorage} from "./t2r/storage.js";
import {translate as t} from "./t2r/i18n.js";
import {RedmineService} from "./t2r/services.js";
import {Widget} from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as duration from "./t2r/duration.js";
import * as utils from "./t2r/utils.js"
import * as flash from "./t2r/flash.js"

/**
 * The 'Import to Redmine' form.
 */
class PublishForm {
  readonly element: JQuery<HTMLElement>
  static _instance: PublishForm | null

  private constructor(element: HTMLElement) {
    var that = this
    this.element = $(element)
    this.element.on('submit', () => {
      return that.onSubmit()
    })
  }

  public static instance(): PublishForm {
    if (!PublishForm._instance) {
      const elem = document.getElementById('publish-form')!
      PublishForm._instance = new PublishForm(elem)
    }

    return PublishForm._instance!
  }

  public onSubmit() {
    if (confirm('This action cannot be undone. Do you really want to continue?')) {
      setTimeout(T2R.publishToRedmine, 0)
    }
    return false
  }

  /**
   * Disables form submission.
   */
  public disable() {
    this.element.find('#btn-publish').attr('disabled', 'disabled')
  }

  /**
   * Enables form submission.
   */
  public enable() {
    this.element.find('#btn-publish').removeAttr('disabled')
  }
}

/**
 * The filter form.
 */
class FilterForm {
  readonly element: JQuery<HTMLElement>
  static _instance: FilterForm | null

  public static instance(): FilterForm {
    if (!FilterForm._instance) {
      const elem = document.getElementById('filter-form')!
      FilterForm._instance = new FilterForm(elem)
    }

    return FilterForm._instance!
  }

  private constructor(element: HTMLElement) {
    this.element = $(element)
    this.init()
  }

  public getDefaults(): any {
    return {
      date: utils.dateFormatYYYYMMDD(new Date()),
      'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
      'default-activity': T2R.localStorage.get('default-activity'),
      'rounding-value': T2R.localStorage.get('rounding-value'),
      'rounding-direction': T2R.localStorage.get('rounding-direction')
    }
  }

  public getValues() {
    const $defaultActivity = $('select#default-activity')
    const defaultActivity = $defaultActivity.val() || $defaultActivity.data('selected')

    const $togglWorkspace = $('select#toggl-workspace')
    let togglWorkspace = $togglWorkspace.val() || $togglWorkspace.data('selected')

    let roundingValue = $('input#rounding-value').val()
    roundingValue = roundingValue ? parseInt(roundingValue as string) : 0
    roundingValue = isNaN(roundingValue) ? 0 : roundingValue

    const roundingMethod = $('select#rounding-direction').val()

    let sDate: string | null = $('#date').val() as string
    try {
      utils.dateStringToObject(sDate + ' 00:00:00')
    } catch (e) {
      sDate = null
    }

    return {
      'default-activity': defaultActivity,
      'toggl-workspace': togglWorkspace,
      'rounding-direction': roundingMethod,
      'rounding-value': roundingValue,
      date: sDate
    }
  }

  public setValues(values: any) {
    this.element
      .find(':input')
      .each(function () {
        const $field = $(this)
        const name = $field.attr('name')
        const value = values[name]

        if (typeof value === 'undefined') return

        switch (name) {
          case 'default-activity':
          case 'toggl-workspace':
            $field
              .data('selected', value)
              .val(value)
            break;

          default:
            if (typeof value !== 'undefined') {
              $field.val(values[name])
            }
            break;
        }
      })
  }

  private init() {
    const $form = this.element
    const that = this

    // Initialize apply filters button.
    $form.find('#btn-apply-filters')
      .on('click', () => {
        return that.onSubmit()
      })

    // Initialize reset filters button.
    $form.find('#btn-reset-filters')
      .on('click',() => {
        that.reset()
        return false
      })

    // Handle filter form submission.
    $form.on('submit',(e) => {
      e.preventDefault()
      return that.onSubmit()
    });
  }

  public reset(values: any = {}) {
    // Merge values with defaults.
    const defaults = this.getDefaults()
    for (const name in defaults) {
      const value = values[name]
      if (typeof value === 'undefined' || '' === value || false === value) {
        values[name] = defaults[name];
      }
    }

    this.element.find(':input').val('')
    this.setValues(values)
    this.onSubmit()
  }

  public onSubmit() {
    const values = this.getValues()

    if (!values['date']) {
      this.element.find('#date').trigger('focus')
      return false
    }

    T2R.localStorage.set('default-activity', values['default-activity'])
    T2R.localStorage.set('toggl-workspace', values['toggl-workspace'])
    T2R.localStorage.set('rounding-value', values['rounding-value'])
    T2R.localStorage.set('rounding-direction', values['rounding-direction'])

    // Store date and update URL hash.
    const sDate = T2R.tempStorage.set('date', values['date'])
    const oDate = utils.dateStringToObject(sDate)!
    window.location.hash = sDate as string

    // Show date in the headings.
    $('h2 .date').html('(' + oDate.toLocaleDateString() + ')')

    // Log the event.
    console.info('Filter form updated: ', {
      'date': T2R.tempStorage.get('date'),
      'default-activity': T2R.localStorage.get('default-activity'),
      'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
      'rounding-value': T2R.localStorage.get('rounding-value'),
      'rounding-direction': T2R.localStorage.get('rounding-direction')
    });

    setTimeout(() => {
      T2R.updateRedmineReport();
      T2R.updateTogglReport();
    }, 250);

    T2R.publishForm.enable()
    return false
  }
}

/**
 * Toggl 2 Redmine Helper.
 */
const T2R: any = {
  // Browser storage.
  localStorage: new LocalStorage('t2r.'),
  // Temporary storage.
  tempStorage: new TemporaryStorage(),
  // Redmine service.
  redmineService: new RedmineService(T2R_REDMINE_API_KEY),
  // Filter form.
  filterForm: null,
  // Publish form.
  publishForm: null
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
 * Publishes selected Toggl data to Redmine.
 */
T2R.publishToRedmine = function () {
  T2R.publishForm.disable()
  flash.clear();

  // Check for eligible entries.
  var $checkboxes = $('#toggl-report tbody tr input.cb-import');
  if ($checkboxes.filter(':checked').length <= 0) {
    flash.error('Please select the entries which you want to import to Redmine.');
    T2R.publishForm.enable()
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
        const $tr = $(this).addClass('t2r-success');

        // Disable checkboxes.
        $checkbox.removeAttr('checked');
        $tr.find(':input').attr('disabled', 'disabled');

        const statusLabel = renderers.renderImportStatusLabel('Imported')
        $tr.find('td.status').html(statusLabel);
      },
      error: function(xhr) {
        console.error('Request failed');
        const $tr = $(this).addClass('t2r-error');
        const sResponse = xhr.responseText || 'false';
        let errors: string[] = []

        try {
          const oResponse = JSON.parse(sResponse);
          errors = (typeof oResponse.errors === 'undefined') ? ['Unknown error'] : oResponse.errors
        } catch (e) {
          errors = ['The server returned an unexpected response']
        }

        const statusLabel = renderers.renderImportStatusLabel('Failed', errors.join("\n"), 'error')
        $tr.find('td.status').html(statusLabel);
      }
    });
  });

  // Refresh the Redmine report when all items are processed.
  T2R.__publishWatcher = setInterval(function () {
    if (T2R.redmineService.requestQueue.length === 0) {
      clearInterval(T2R.__publishWatcher);
      T2R.publishForm.enable()
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
  const workspaceId = T2R.localStorage.get('toggl-workspace')

  T2R.updateTogglReportLink(date, workspaceId);

  T2R.publishForm.disable()

  // Uncheck the "check all" checkbox.
  const $checkAll = $table.find('.check-all')
    .prop('checked', false)
    .attr('disabled', 'disabled');

  // Fetch time entries from Toggl.
  const query = {
    from: date + ' 00:00:00',
    till: date + ' 23:59:59',
    workspace: workspaceId
  }
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
        const $tr = renderers.renderTogglRow(entry);
        $table.find('tbody').append($tr);
        delete entries[key];
      }
    }

    // Display entries eligible for import.
    for (const key in entries) {
      const entry = entries[key];
      if (entry.status === 'pending' && entry.errors.length === 0) {
        const $tr = renderers.renderTogglRow(entry);
        $table.find('tbody').append($tr);
        pendingEntriesExist = true;

        // TODO: Set default activity on activity dropdowns.

        $tr.find('input[data-property=hours]')
          .on('input', T2R.updateTogglTotals)
          .on('change', T2R.updateTogglTotals)

        $tr.find('.cb-import')
          .on('change', T2R.updateTogglTotals)
      }
    }

    // Display entries not eligible for import.
    for (const key in entries) {
      const entry = entries[key];
      if (entry.status === 'pending' && entry.errors.length > 0) {
        const $tr = renderers.renderTogglRow(entry);
        $table.find('tbody').append($tr);
      }
    }

    // Display entries which are already import.
    for (const key in entries) {
      const entry = entries[key];
      if (entry.status === 'imported') {
        const $tr = renderers.renderTogglRow(entry);
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
      if (T2R.filterForm.element.has(':focus').length > 0) {
        $checkAll.trigger('focus');
      }

      // Enable the "check-all" checkbox.
      $checkAll.removeAttr('disabled');

      T2R.publishForm.enable()
    }
  });
}

/**
 * Updates the Toggl report URL.
 *
 * @param {date} date
 *   Report date.
 * @param {number|null} workspaceId
 *   Toggl workspace ID.
 */
T2R.updateTogglReportLink = function (date: string, workspaceId: number | null) {
  workspaceId = workspaceId || T2R.tempStorage.get('default_toggl_workspace', 0)

  const url = T2R_TOGGL_REPORT_URL_FORMAT
    .replace(/\[@date\]/g, date)
    .replace('[@workspace]', workspaceId.toString());
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

  T2R.updateRedmineReportLink(from)

  // Fetch time entries from Redmine.
  const query = {
    from: from.toISOString().split('T')[0] + 'T00:00:00Z',
    till: till.toISOString().split('T')[0] + 'T00:00:00Z'
  }
  T2R.redmineService.getTimeEntries(query, (entries: any[] | null) => {
    if (entries === null) {
      flash.error('An error has occurred. Please try again after some time.')
      entries = []
    }

    const $table = T2R.getRedmineTable().addClass('t2r-loading');

    // Display entries from Redmine.
    for (const key in entries) {
      const entry = entries[key];
      const markup = renderers.renderRedmineRow(entry);
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
 * @param {string} date
 *   Report date.
 */
T2R.updateRedmineReportLink = function (date) {
  const url = T2R_REDMINE_REPORT_URL_FORMAT.replace('[@date]', date)
  $('#redmine-report-link').attr('href', url)
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
 * This is where it starts.
 */
$(() => {
  Widget.initialize();
  T2R.publishForm = PublishForm.instance()

  T2R.filterForm = FilterForm.instance()
  T2R.filterForm.reset({ date: utils.getDateFromLocationHash() })

  T2R.initTogglReport();
  T2R.updateLastImportDate();
});
