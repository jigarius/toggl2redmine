import {RoundingMethod} from "./t2r/datetime.js";

declare const T2R_REDMINE_API_KEY: string;
declare const T2R_REDMINE_REPORT_URL_FORMAT : string;
declare const T2R_TOGGL_REPORT_URL_FORMAT: string;

import {LocalStorage, TemporaryStorage} from "./t2r/storage.js";
import {translate as t} from "./t2r/i18n.js";
import {RedmineAPIService} from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as models from "./t2r/models.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js"
import * as flash from "./t2r/flash.js"

/**
 * The 'Import to Redmine' form.
 */
class PublishForm {
  readonly element: JQuery<HTMLElement>
  static _instance: PublishForm | null

  private constructor(element: HTMLElement) {
    const that = this
    this.element = $(element)
    this.element.on('submit', () => {
      that.onSubmit()
      return false
    })
  }

  public static instance(): PublishForm {
    if (!PublishForm._instance) {
      PublishForm._instance = new PublishForm(
        document.getElementById('publish-form') as HTMLElement
      )
    }

    return PublishForm._instance as PublishForm
  }

  public onSubmit() {
    if (!confirm('This action cannot be undone. Do you really want to continue?')) {
      return
    }

    this.disable()
    flash.clear()

    // If no entries are selected for import.
    if (T2R.togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
      flash.error('Please select the entries which you want to import to Redmine.');
      this.enable()
      return
    }

    console.info('Sending time entries to Redmine.')
    T2R.togglReport.element.find('tbody tr').each(function (this: HTMLElement) {
      const $tr = $(this)

      // If the item is not marked for import, ignore it.
      if (!$tr.find('input.cb-import').prop('checked')) {
        return
      }

      const timeEntry = {
        spent_on: T2R.tempStorage.get('date') as string,
        issue_id: parseInt($tr.find('[data-property="issue_id"]').val() as string),
        comments: $tr.find('[data-property="comments"]').val() as string,
        activity_id: parseInt($tr.find('[data-property="activity_id"]').val() as string),
        hours: '0.00'
      }

      // Convert time to Redmine-friendly format, i.e. hh:mm.
      const dur = new datetime.Duration()
      try {
        dur.setHHMM($tr.find('[data-property="hours"]').val() as string)
        timeEntry.hours = dur.asDecimal()
      } catch (e) {
        console.warn('Entry ignored: Invalid duration.', timeEntry)
        return
      }

      // Ignore entries with 0 duration.
      if (dur.seconds < 30) {
        console.warn('Entry ignored: Duration is less than 30 seconds.', timeEntry);
        return
      }

      T2R.redmineService.postTimeEntry({
        time_entry: timeEntry,
        toggl_ids: $tr.data('t2r.entry').ids
      }, (errors: string[]) => {
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
 * The filter/options form.
 */
interface FilterFormValues {
  date?: string,
  'default-activity'?: number,
  'toggl-workspace'?: number,
  'rounding-value'?: number,
  'rounding-direction'?: RoundingMethod
}

class FilterForm {
  readonly element: JQuery<HTMLElement>
  static _instance: FilterForm | null

  public static instance(): FilterForm {
    if (!FilterForm._instance) {
      FilterForm._instance = new FilterForm(
        document.getElementById('filter-form') as HTMLElement
      )
    }

    return FilterForm._instance as FilterForm
  }

  private constructor(element: HTMLElement) {
    this.element = $(element)
    this.init()
  }

  public getDefaults(): FilterFormValues {
    const values: FilterFormValues = {}

    values['date'] = (new datetime.DateTime).toHTMLDate()

    const workspaceId = T2R.localStorage.get('toggl-workspace')
    if (workspaceId) {
      values['toggl-workspace'] = parseInt(workspaceId)
    }

    const defaultActivityId = T2R.localStorage.get('default-activity')
    if (defaultActivityId) {
      values['default-activity'] = parseInt(defaultActivityId)
    }

    const roundingValue = T2R.localStorage.get('rounding-value') || '0'
    values['rounding-value'] = parseInt(roundingValue)

    const roundingDirection = T2R.localStorage.get('rounding-direction')
    if (roundingDirection) {
      values['rounding-direction'] = roundingDirection
    }

    return values
  }

  public getValues(): FilterFormValues {
    const values: FilterFormValues = {}

    const $defaultActivityId = $('select#default-activity')
    const defaultActivityId = $defaultActivityId.val() || $defaultActivityId.data('selected')
    if (defaultActivityId) {
      values['default-activity'] = parseInt(defaultActivityId)
    }

    const $togglWorkspaceId = $('select#toggl-workspace')
    const togglWorkspaceId = $togglWorkspaceId.val() || $togglWorkspaceId.data('selected')
    if (togglWorkspaceId) {
      values['toggl-workspace'] = togglWorkspaceId
    }

    const sRoundingValue = $('input#rounding-value').val() as string
    const nRoundingValue = parseInt(sRoundingValue)
    if (sRoundingValue && !isNaN(nRoundingValue)) {
      values['rounding-value'] = parseInt(sRoundingValue)
    }

    const roundingMethod = $('select#rounding-direction').val()
    if (roundingMethod) {
      values['rounding-direction'] = roundingMethod as RoundingMethod
    }

    const sDate: string = $('#date').val() as string
    try {
      datetime.DateTime.fromString(sDate)
      values['date'] = sDate
    } catch (e) {
      console.error(e)
    }

    return values
  }

  public setValues(values: FilterFormValues) {
    this.element
      .find(':input')
      .each(function () {
        const $field = $(this)
        const name = $field.attr('name') as string

        if (!name) return

        switch (name) {
          case 'date':
            if (!values['date']) return

            $field.val(values['date'] as string)
            break

          case 'default-activity':
            if (!values['default-activity']) return

            $field
              .data('selected', values['default-activity'] as number)
              .val(values['default-activity'] as number)
            break

          case 'toggl-workspace':
            if (!values['toggl-workspace']) return

            $field
              .data('selected', values['toggl-workspace'] as number)
              .val(values['toggl-workspace'] as number)
            break

          case 'rounding-direction':
            if (!values['rounding-direction']) return

            $field.val(values['rounding-direction'] as string)
            break

          case 'rounding-value':
            if (!values['rounding-value']) return

            $field.val(values['rounding-value'] as number)
            break

          default:
            throw `Unexpected field: ${name}`
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

  public reset(values: FilterFormValues = {}) {
    const defaults = this.getDefaults()

    if (!values['date']) {
      values['date'] = defaults['date']
    }

    if (!values['default-activity']) {
      values['default-activity'] = defaults['default-activity']
    }

    if (!values['toggl-workspace']) {
      values['toggl-workspace'] = defaults['toggl-workspace']
    }

    if (!values['rounding-direction']) {
      values['rounding-direction'] = defaults['rounding-direction']
    }

    if (!values['rounding-value']) {
      values['rounding-value'] = defaults['rounding-value']
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

    // Store date and update URL hash.
    const oDate = datetime.DateTime.fromString(values['date'])
    if (!oDate) {
      alert('Please enter a valid date.')
      this.element.find('#date').trigger('focus')
      return false
    }

    T2R.localStorage.set('default-activity', values['default-activity'])
    T2R.localStorage.set('toggl-workspace', values['toggl-workspace'])
    T2R.localStorage.set('rounding-value', values['rounding-value'])
    T2R.localStorage.set('rounding-direction', values['rounding-direction'])
    T2R.tempStorage.set('date', oDate.toHTMLDate())

    console.info('Filter form submitted', {
      'date': T2R.tempStorage.get('date'),
      'default-activity': T2R.localStorage.get('default-activity'),
      'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
      'rounding-value': T2R.localStorage.get('rounding-value'),
      'rounding-direction': T2R.localStorage.get('rounding-direction')
    });

    window.location.hash = oDate.toHTMLDate()
    $('h2 .date').html('(' + oDate.date.toLocaleDateString() + ')')

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
      RedmineReport._instance = new RedmineReport(
          document.getElementById('redmine-report') as HTMLElement
      )
    }

    return RedmineReport._instance as RedmineReport
  }

  private constructor(element: HTMLElement) {
    this.element = $(element)
  }

  public update() {
    var that = this

    this.showLoader()
    this.makeEmpty()

    const sDate: string = T2R.tempStorage.get('date')
    const oDate = datetime.DateTime.fromString(sDate)

    this.updateLink(sDate)
    this.updateLastImportDate()

    const query = { from: oDate, till: oDate }
    T2R.redmineService.getTimeEntries(query, (entries: models.TimeEntry[] | null) => {
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
    const total = new datetime.Duration()

    // Iterate over all rows and add the hours.
    this.element.find('tbody tr .hours')
      .each(function () {
        const hours = $(this).text().trim();
        if (hours.length > 0) {
          total.add(new datetime.Duration(hours));
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

    T2R.redmineService.getLastImportDate((lastImportDate: datetime.DateTime | null) => {
      const sDate = lastImportDate ? lastImportDate.date.toLocaleDateString() : 'Unknown'
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
      TogglReport._instance = new TogglReport(
        document.getElementById('toggl-report') as HTMLElement
      )
    }

    return TogglReport._instance as TogglReport
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
    const sDate = T2R.tempStorage.get('date')
    const workspaceId = T2R.localStorage.get('toggl-workspace') as number | null

    this.updateLink(sDate, workspaceId)

    // Uncheck the "check all" checkbox.
    this.checkAll
      .prop('checked', false)
      .attr('disabled', 'disabled')

    // Fetch time entries from Toggl.
    const query = {
      from: datetime.DateTime.fromString(sDate + ' 00:00:00'),
      till: datetime.DateTime.fromString(sDate + ' 23:59:59'),
      workspace: workspaceId
    }
    T2R.redmineService.getTogglTimeEntries(query, (entries: models.KeyedTogglTimeEntryCollection) => {
      let pendingEntriesExist = false

      // Prepare rounding rules.
      const roundingValue = T2R.localStorage.get('rounding-value')
      const roundingMethod = T2R.localStorage.get('rounding-direction')

      // TODO: Use entries.map() instead?
      for (const key in entries) {
        const entry = entries[key]

        entry.duration = new datetime.Duration(Math.max(0, entry.duration as number))
        entry.roundedDuration = new datetime.Duration(entry.duration.seconds)

        // Prepare rounded duration as per rounding rules.
        if (roundingMethod !== '' && roundingValue > 0) {
          entry.roundedDuration.roundTo(roundingValue, roundingMethod)
        }
        else {
          entry.roundedDuration.roundTo(1, datetime.RoundingMethod.Regular)
        }

        entries[key] = entry
      }

      if (entries === {}) {
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
      widget.initialize(that.element[0])
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
      .replace('[@workspace]', (workspaceId as number).toString());
    $('#toggl-report-link').attr('href', url);
  }

  /**
   * Updates the total in the Redmine report footer.
   */
  private updateTotal() {
    const total = new datetime.Duration()

    // Iterate over all rows and add the hours.
    this.element.find('tbody tr').each(function () {
      const $tr = $(this)
      const dur = new datetime.Duration()

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
 *
 * @todo Remove the T2R constant.
 */
const T2R: any = {
  localStorage: new LocalStorage('t2r.'),
  tempStorage: new TemporaryStorage(),
  redmineService: new RedmineAPIService(T2R_REDMINE_API_KEY),
  filterForm: null,
  publishForm: null,
  redmineReport: null,
  togglReport: null
}

/**
 * This is where it starts.
 */
$(() => {
  widget.initialize();
  T2R.publishForm = PublishForm.instance()
  T2R.filterForm = FilterForm.instance()
  T2R.redmineReport = RedmineReport.instance()
  T2R.togglReport = TogglReport.instance()

  T2R.filterForm.reset({ date: utils.getDateFromLocationHash() })
});
