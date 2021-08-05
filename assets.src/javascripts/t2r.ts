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
    const togglWorkspace = $togglWorkspace.val() || $togglWorkspace.data('selected')

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
        const name = $field.attr('name') as string
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
      T2R.redmineReport.update()
      T2R.togglReport.update()
    }, 250);

    T2R.publishForm.enable()
    return false
  }
}

/**
 * The Redmine report table.
 */
class RedmineReport {
  readonly element: JQuery<HTMLElement>
  static _instance: RedmineReport | null

  public static instance(): RedmineReport {
    if (!RedmineReport._instance) {
      const elem = document.getElementById('redmine-report')!
      RedmineReport._instance = new RedmineReport(elem)
    }

    return RedmineReport._instance!
  }

  private constructor(element: HTMLElement) {
    this.element = $(element)
  }

  public update() {
    var that = this

    this.showLoader()
    this.makeEmpty()

    const sDate: string = T2R.tempStorage.get('date')
    const oDate = utils.dateStringToObject(sDate)!

    this.updateLink(sDate)
    this.updateLastImportDate()

    const query = {
      from: oDate.toISOString().split('T')[0] + 'T00:00:00Z',
      till: oDate.toISOString().split('T')[0] + 'T00:00:00Z'
    }
    T2R.redmineService.getTimeEntries(query, (entries: any[] | null) => {
      if (entries === null) {
        flash.error('An error has occurred. Please try again after some time.')
        entries = []
      }

      if (entries.length === 0) {
        that.showEmptyMessage()
      }

      for (const time_entry of entries) {
        const markup = renderers.renderRedmineRow(time_entry)
        that.element.find('tbody').append(markup)
      }

      that.updateTotal()
      that.hideLoader()
    });
  }

  private updateLink(date: string) {
    const url = T2R_REDMINE_REPORT_URL_FORMAT.replace('[@date]', date)
    $('#redmine-report-link').attr('href', url)
  }

  public updateTotal() {
    const total = new duration.Duration()

    // Iterate over all rows and add the hours.
    this.element.find('tbody tr .hours')
      .each(function () {
        const hours = $(this).text().trim();
        if (hours.length > 0) {
          total.add(new duration.Duration(hours));
        }
      })

    this.element.find('[data-property="total-hours"]').html(total.asHHMM());
  }

  /**
   * Updates the date of the latest time entry on Redmine.
   */
  public updateLastImportDate() {
    const $el = $('#last-imported')
      .html('&nbsp;')
      .addClass('t2r-loading')

    T2R.redmineService.getLastImportDate((lastImportDate: Date | null) => {
      const sDate = lastImportDate ? lastImportDate.toLocaleDateString() : 'Unknown'
      $el.text(sDate).removeClass('t2r-loading')
    })
  }

  public showEmptyMessage() {
    const colspan = this.element.find('thead tr:first th').length
    const message = t('t2r.error.list_empty')
    const markup = `<tr><td colspan="${colspan}">${message}</td></tr>`
    this.element.find('tbody').html(markup);
  }

  private makeEmpty() {
    this.element.find('tbody').html('')
  }

  public showLoader() {
    this.element.addClass('t2r-loading')
  }

  public hideLoader() {
    this.element.removeClass('t2r-loading')
  }
}

class TogglReport {
  readonly element: JQuery<HTMLElement>
  readonly checkAll: JQuery<HTMLElement>
  static _instance: TogglReport | null

  public static instance(): TogglReport {
    if (!TogglReport._instance) {
      const elem = document.getElementById('toggl-report')!
      TogglReport._instance = new TogglReport(elem)
    }

    return TogglReport._instance!
  }

  private constructor(element: HTMLElement) {
    this.element = $(element)
    this.checkAll = this.element.find('input.check-all')
    this.init()
  }

  private init() {
    var that = this
    this.checkAll.tooltip()
      .on('change',() => {
        const checked = $(this).prop('checked');
        that.element.find('tbody input.cb-import:enabled')
          .prop('checked', checked)
          .trigger('change')
      })
  }

  public update() {
    var that = this

    T2R.publishForm.disable()
    this.showLoader()
    this.makeEmpty()

    // Determine report date.
    const sDate = T2R.tempStorage.get('date');
    const workspaceId = T2R.localStorage.get('toggl-workspace')

    this.updateLink(sDate, workspaceId)

    // Uncheck the "check all" checkbox.
    this.checkAll
      .prop('checked', false)
      .attr('disabled', 'disabled')

    // Fetch time entries from Toggl.
    const query = {
      from: sDate + ' 00:00:00',
      till: sDate + ' 23:59:59',
      workspace: workspaceId
    }
    T2R.redmineService.getTogglTimeEntries(query, (entries: any) => {
      let pendingEntriesExist = false

      // Prepare rounding rules.
      const roundingValue = T2R.localStorage.get('rounding-value')
      const roundingMethod = T2R.localStorage.get('rounding-direction')

      // TODO: Use entries.map() instead?
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

        entries[key] = entry
      }

      if (0 === entries.length) {
        this.showEmptyMessage()
      }

      // Display entries that are running at the moment.
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === 'running') {
          const $tr = renderers.renderTogglRow(entry);
          that.element.find('tbody').append($tr);
          delete entries[key];
        }
      }

      // Display entries eligible for import.
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === 'pending' && entry.errors.length === 0) {
          const $tr = renderers.renderTogglRow(entry);
          that.element.find('tbody').append($tr);
          pendingEntriesExist = true

          // TODO: Set default activity on activity dropdowns.

          $tr.find('input[data-property=hours]')
            .on('input', T2R.updateTogglTotals)
            .on('change', T2R.updateTogglTotals)

          $tr.find('select[data-property=activity_id]')
            .attr('data-selected', T2R.localStorage.get('default-activity'))

          $tr.find('.cb-import')
            .on('change', T2R.updateTogglTotals)
        }
      }

      // Display entries not eligible for import.
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === 'pending' && entry.errors.length > 0) {
          const $tr = renderers.renderTogglRow(entry);
          that.element.find('tbody').append($tr);
        }
      }

      // Display entries which are already import.
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === 'imported') {
          const $tr = renderers.renderTogglRow(entry);
          that.element.find('tbody').append($tr);
        }
      }

      that.updateTotal()
      Widget.initialize(that.element[0])
      that.hideLoader()

      if (!pendingEntriesExist) {
        return
      }

      that.checkAll.removeAttr('disabled')
      T2R.publishForm.enable()

      // If the update was triggered from the filter form, then focus the
      // "check-all" button to allow easier keyboard navigation.
      if (T2R.filterForm.element.has(':focus').length > 0) {
        that.checkAll.trigger('focus')
      }
    })
  }

  /**
   * Updates the Toggl report URL.
   *
   * @param {date} date
   *   Report date.
   * @param {number|null} workspaceId
   *   Toggl workspace ID.
   */
  private updateLink(date: string, workspaceId: number | null) {
    workspaceId = workspaceId || T2R.tempStorage.get('default_toggl_workspace', 0)

    const url = T2R_TOGGL_REPORT_URL_FORMAT
      .replace(/\[@date\]/g, date)
      .replace('[@workspace]', workspaceId!.toString());
    $('#toggl-report-link').attr('href', url);
  }

  /**
   * Updates the total in the Redmine report footer.
   */
  private updateTotal() {
    const total = new duration.Duration()

    // Iterate over all rows and add the hours.
    this.element.find('tbody tr').each(function () {
      const $tr = $(this)
      const dur = new duration.Duration()

      // Ignore erroneous rows.
      if ($tr.hasClass('t2r-error')) {
        return
      }

      // Ignore unchecked rows.
      if (!$tr.find('.cb-import').is(':checked')) {
        return
      }

      // Parse the input as time and add it to the total.
      const hours = $tr.find('[data-property="hours"]').val() as string
      try {
        // Assume time to be hours and minutes.
        dur.setHHMM(hours);
        total.add(dur);
      } catch(e) {
        console.error(e);
      }
    })

    this.element.find('[data-property="total-hours"]').html(total.asHHMM())
  }

  public showEmptyMessage() {
    const colspan = this.element.find('thead tr:first th').length
    const message = t('t2r.error.list_empty')
    const markup = `<tr><td colspan="${colspan}">${message}</td></tr>`
    this.element.find('tbody').html(markup);
  }

  private makeEmpty() {
    this.element.find('tbody').html('')
  }

  public showLoader() {
    this.element.addClass('t2r-loading')
  }

  public hideLoader() {
    this.element.removeClass('t2r-loading')
  }
}

/**
 * Toggl 2 Redmine Helper.
 */
const T2R: any = {
  localStorage: new LocalStorage('t2r.'),
  tempStorage: new TemporaryStorage(),
  redmineService: new RedmineService(T2R_REDMINE_API_KEY),
  filterForm: null,
  publishForm: null,
  redmineReport: null,
  togglReport: null
}

/**
 * Publishes selected Toggl data to Redmine.
 */
T2R.publishToRedmine = function () {
  T2R.publishForm.disable()
  flash.clear();

  // Check for eligible entries.
  const $checkboxes = $('#toggl-report tbody tr input.cb-import');
  if ($checkboxes.filter(':checked').length <= 0) {
    flash.error('Please select the entries which you want to import to Redmine.');
    T2R.publishForm.enable()
    return;
  }

  // Post eligible entries to Redmine.
  console.info('Pushing time entries to Redmine.')
  $('#toggl-report tbody tr').each(function () {
    const $tr = $(this)
    const toggl_entry = $tr.data('t2r.entry');

    // If the item is not marked for import, ignore it.
    if (!$tr.find('input.cb-import').prop('checked')) {
      return;
    }

    // Prepare the data to be pushed to Redmine.
    const redmine_entry = {
      spent_on: T2R.tempStorage.get('date') as string,
      issue_id: parseInt($tr.find('[data-property="issue_id"]').val() as string),
      comments: $tr.find('[data-property="comments"]').val() as string,
      activity_id: parseInt($tr.find('[data-property="activity_id"]').val() as string),
      hours: '0.00'
    }

    // Convert time to Redmine-friendly format, i.e. hh:mm.
    const dur = new duration.Duration();
    try {
      dur.setHHMM($tr.find('[data-property="hours"]').val() as string)
      redmine_entry.hours = dur.asDecimal()
    } catch (e) {
      console.warn('Invalid duration. Ignoring entry.', redmine_entry)
      return
    }

    // Ignore entries with 0 duration.
    if (dur.seconds < 30) {
      console.warn('Entry ignored: Duration is less than 30 seconds.', redmine_entry);
    }

    T2R.redmineService.postTimeEntry(redmine_entry, toggl_entry.ids, (errors: string[]) => {
      if (errors.length !== 0) {
        $tr.addClass('t2r-error')
        const statusLabel = renderers.renderImportStatusLabel('Failed', errors.join("\n"), 'error')
        $tr.find('td.status').html(statusLabel)

        return
      }

      $tr.addClass('t2r-success')
      $tr.find(':input').attr('disabled', 'disabled')
      $tr.find('input.cb-import').removeAttr('checked')

      const statusLabel = renderers.renderImportStatusLabel('Imported')
      $tr.find('td.status').html(statusLabel)
    })
  })

  // Refresh the Redmine report when all items are processed.
  T2R.__publishWatcher = setInterval(() => {
    if (T2R.redmineService.requestQueue.length === 0) {
      clearInterval(T2R.__publishWatcher);
      T2R.publishForm.enable()
      T2R.redmineReport.update()
    }
  }, 250);
}

/**
 * This is where it starts.
 */
$(() => {
  Widget.initialize();
  T2R.publishForm = PublishForm.instance()
  T2R.filterForm = FilterForm.instance()
  T2R.redmineReport = RedmineReport.instance()
  T2R.togglReport = TogglReport.instance()

  T2R.filterForm.reset({ date: utils.getDateFromLocationHash() })
});
