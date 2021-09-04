declare const T2R_REDMINE_API_KEY: string

import {LocalStorage} from "./t2r/storage.js"
import {translate as t} from "./t2r/i18n.js"
import {RedmineAPIService} from "./t2r/services.js"
import * as widget from "./t2r/widgets.js"
import * as models from "./t2r/models.js"
import * as renderers from "./t2r/renderers.js"
import * as datetime from "./t2r/datetime.js"
import * as utils from "./t2r/utils.js"
import * as flash from "./t2r/flash.js"

/**
 * The 'Import to Redmine' form.
 */
class ImportForm {
  readonly element: JQuery<HTMLElement>
  readonly importButton: JQuery<HTMLElement>
  private filterForm: FilterForm
  private redmineAPI: RedmineAPIService
  private redmineReport: RedmineReport
  private togglReport: TogglReport

  public constructor(
    element: HTMLElement,
    filterForm: FilterForm,
    redmineAPI: RedmineAPIService,
    redmineReport: RedmineReport,
    togglReport: TogglReport
  ) {
    const that = this
    this.element = $(element)
    this.importButton = this.element.find('#btn-import')

    this.filterForm = filterForm
    this.redmineAPI = redmineAPI
    this.redmineReport = redmineReport
    this.togglReport = togglReport

    this.filterForm.eventManager.on('preSubmit', function() {
      that.disable()
    })

    this.filterForm.eventManager.on('postSubmit', function() {
      that.enable()
    })

    this.element.on('submit', () => {
      that.onSubmit()
      return false
    })
  }

  public onSubmit() {
    const that = this
    const filterFormValues = this.filterForm.getValues()

    if (!confirm('This action cannot be undone. Do you really want to continue?')) {
      return
    }

    this.disable()
    flash.clear()

    // If no entries are selected for import.
    if (this.togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
      flash.error(t('t2r.error.no_entries_selected'));
      this.enable()
      return
    }

    console.info('Sending time entries to Redmine.')
    this.togglReport.element.find('tbody tr').each(function (this: HTMLElement) {
      const $tr = $(this)

      // If the item is not marked for import, ignore it.
      if (!$tr.find('input.cb-import').prop('checked')) {
        return
      }

      const timeEntry = {
        spent_on: filterFormValues['date'] as string,
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

      that.redmineAPI.postTimeEntry({
        time_entry: timeEntry,
        toggl_ids: $tr.data('t2r.entry').ids
      }, (errors: string[]) => {
        // If all requests have been processed.
        if (that.redmineAPI.requestQueue.length === 0) {
          that.enable()
          that.redmineReport.update()
        }

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
  }

  /**
   * Disables form submission.
   */
  public disable() {
    this.importButton.attr('disabled', 'disabled')
  }

  /**
   * Enables form submission.
   */
  public enable() {
    this.importButton.removeAttr('disabled')
  }
}

/**
 * The filter/options form.
 */
interface FilterFormValues {
  date?: string,
  'default-activity-id'?: number,
  'toggl-workspace-id'?: number,
  'rounding-value'?: number,
  'rounding-method'?: datetime.DurationRoundingMethod
}

class FilterForm {
  readonly element: JQuery<HTMLElement>
  readonly eventManager: utils.EventManager
  private localStorage: LocalStorage

  public constructor(element: HTMLElement, localStorage: LocalStorage) {
    const that = this
    this.element = $(element)
    this.localStorage = localStorage
    this.eventManager = new utils.EventManager()

    // Initialize apply filters button.
    this.element.find('#btn-apply-filters')
      .on('click', () => {
        return that.onSubmit()
      })

    // Initialize reset filters button.
    this.element.find('#btn-reset-filters')
      .on('click',() => {
        that.reset()
        return false
      })

    // Handle filter form submission.
    this.element.on('submit',(e) => {
      e.preventDefault()
      return that.onSubmit()
    });
  }

  public getDefaults(): FilterFormValues {
    const values: FilterFormValues = {}

    values['date'] = (new datetime.DateTime).toHTMLDateString()

    const workspaceId = this.localStorage.get('toggl-workspace-id')
    if (workspaceId) {
      values['toggl-workspace-id'] = parseInt(workspaceId as string)
    }

    const defaultActivityId = this.localStorage.get('default-activity-id')
    if (defaultActivityId) {
      values['default-activity-id'] = parseInt(defaultActivityId as string)
    }

    const roundingValue = this.localStorage.get('rounding-value') as string || '0'
    values['rounding-value'] = parseInt(roundingValue)

    const roundingMethod = this.localStorage.get('rounding-method') as datetime.DurationRoundingMethod
    if (roundingMethod) {
      values['rounding-method'] = roundingMethod as datetime.DurationRoundingMethod
    }

    return values
  }

  public getValues(): FilterFormValues {
    const values: FilterFormValues = {}

    const $defaultActivityId = $('select#default-activity-id')
    const defaultActivityId = $defaultActivityId.val()
    if (defaultActivityId) {
      values['default-activity-id'] = parseInt(defaultActivityId as string)
    }

    const $togglWorkspaceId = $('select#toggl-workspace-id')
    const togglWorkspaceId = $togglWorkspaceId.val() || $togglWorkspaceId.data('selected')
    if (togglWorkspaceId) {
      values['toggl-workspace-id'] = togglWorkspaceId
    }

    const sRoundingValue = $('input#rounding-value').val() as string
    const nRoundingValue = parseInt(sRoundingValue)
    if (sRoundingValue && !isNaN(nRoundingValue)) {
      values['rounding-value'] = parseInt(sRoundingValue)
    }

    const roundingMethod = $('select#rounding-method').val() as datetime.DurationRoundingMethod
    if (roundingMethod) {
      values['rounding-method'] = roundingMethod as datetime.DurationRoundingMethod
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

          case 'default-activity-id':
            if (!values['default-activity-id']) return

            $field
              .data('selected', values['default-activity-id'] as number)
              .val(values['default-activity-id'] as number)
            break

          case 'toggl-workspace-id':
            if (!values['toggl-workspace-id']) return

            $field
              .data('selected', values['toggl-workspace-id'] as number)
              .val(values['toggl-workspace-id'] as number)
            break

          case 'rounding-method':
            if (!values['rounding-method']) return

            $field.val(values['rounding-method'] as string)
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

  public reset(values: FilterFormValues = {}) {
    const defaults = this.getDefaults()

    if (!values['date']) {
      values['date'] = defaults['date']
    }

    if (!values['default-activity-id']) {
      values['default-activity-id'] = defaults['default-activity-id']
    }

    if (!values['toggl-workspace-id']) {
      values['toggl-workspace-id'] = defaults['toggl-workspace-id']
    }

    if (!values['rounding-method']) {
      values['rounding-method'] = defaults['rounding-method']
    }

    if (!values['rounding-value']) {
      values['rounding-value'] = defaults['rounding-value']
    }

    this.element.find(':input').val('')
    this.setValues(values)
    this.onSubmit()
  }

  public onSubmit() {
    this.eventManager.trigger('preSubmit')
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

    this.localStorage.set('default-activity-id', values['default-activity-id'])
    this.localStorage.set('toggl-workspace-id', values['toggl-workspace-id'])
    this.localStorage.set('rounding-value', values['rounding-value'])
    this.localStorage.set('rounding-method', values['rounding-method'])

    console.info('Filter updated', values);

    window.location.hash = oDate.toHTMLDateString()
    $('h2 .date').html('(' + oDate.date.toLocaleDateString() + ')')

    this.eventManager.trigger('postSubmit')

    return false
  }
}

/**
 * The Redmine report table.
 */
class RedmineReport {
  readonly element: JQuery<HTMLElement>
  static _instance: RedmineReport | null
  private filterForm: FilterForm
  private redmineAPI: RedmineAPIService

  public constructor(element: HTMLElement, filterForm: FilterForm, redmineAPI: RedmineAPIService) {
    const that = this
    this.element = $(element)
    this.filterForm = filterForm
    this.redmineAPI = redmineAPI

    this.filterForm.eventManager.on('postSubmit', function() {
      that.update()
    })
  }

  public update() {
    const that = this

    this.showLoader()
    this.makeEmpty()

    const sDate: string = this.filterForm.getValues()['date'] as string
    const oDate = datetime.DateTime.fromString(sDate)

    this.updateLink(oDate)
    this.updateLastImportDate()

    const query = { from: oDate, till: oDate }
    this.redmineAPI.getTimeEntries(query, (entries: models.TimeEntry[] | null) => {
      if (entries === null) {
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

  /**
   * Updates the link to the Redmine report page.
   *
   * @param date
   *   Report date.
   */
  private updateLink(date: datetime.DateTime) {
    const url = `/time_entries?utf8=✓&set_filter=1&sort=spent_on:desc&f[]=spent_on&op[spent_on]=%3D&v[spent_on][]=[${date.toHTMLDateString()}]&f[]=user_id&op[user_id]=%3D&v[user_id][]=me&c[]=project&c[]=spent_on&c[]=user&c[]=activity&c[]=issue&c[]=comments&c[]=hours&group_by=spent_on&t[]=hours&t[]=`
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

    this.redmineAPI.getLastImportDate((lastImportDate: datetime.DateTime | null) => {
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
  private filterForm: FilterForm
  private redmineAPI: RedmineAPIService

  public constructor(element: HTMLElement, filterForm: FilterForm, redmineAPI: RedmineAPIService) {
    const that = this
    this.element = $(element)
    this.checkAll = this.element.find('input.check-all')
    this.filterForm = filterForm
    this.redmineAPI = redmineAPI

    this.filterForm.eventManager.on('postSubmit', function() {
      that.update()
    })

    this.checkAll
      .on('change',() => {
        const checked = $(that.checkAll).prop('checked')
        that.element.find('tbody input.cb-import:enabled')
          .prop('checked', checked)
          .trigger('change')
      })
  }

  public update() {
    const that = this
    const filterFormValues = this.filterForm.getValues()

    this.showLoader()
    this.makeEmpty()

    // Determine report date.
    const sDate = filterFormValues['date'] as string
    const oDate = datetime.DateTime.fromString(sDate)
    const workspaceId = filterFormValues['toggl-workspace-id'] as number | null

    this.updateLink(oDate, workspaceId)

    // Uncheck the "check all" checkbox.
    this.checkAll
      .prop('checked', false)
      .attr('disabled', 'disabled')

    // Fetch time entries from Toggl.
    const query = {
      from: datetime.DateTime.fromString(sDate + ' 00:00:00'),
      till: datetime.DateTime.fromString(sDate + ' 23:59:59'),
      workspaceId: workspaceId
    }
    this.redmineAPI.getTogglTimeEntries(query, (entries: models.KeyedTogglTimeEntryCollection) => {
      let pendingEntriesExist = false

      // Prepare rounding rules.
      const roundingValue = filterFormValues['rounding-value'] as number
      const roundingMethod = filterFormValues['rounding-method'] as datetime.DurationRoundingMethod

      // TODO: Use entries.map() instead?
      for (const key in entries) {
        const entry = entries[key]

        entry.duration = new datetime.Duration(Math.max(0, entry.duration as number))
        entry.roundedDuration = new datetime.Duration(entry.duration.seconds)

        // Prepare rounded duration as per rounding rules.
        if (roundingMethod && roundingValue > 0) {
          entry.roundedDuration.roundTo(roundingValue, roundingMethod)
        }
        else {
          entry.roundedDuration.roundTo(1, datetime.DurationRoundingMethod.Regular)
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

      const sDefaultActivityId = filterFormValues['default-activity-id']
        ? filterFormValues['default-activity-id'].toString() : ''

      // Display entries eligible for import.
      for (const key in entries) {
        const entry = entries[key];
        if (entry.status === 'pending' && entry.errors.length === 0) {
          const $tr = renderers.renderTogglRow(entry);
          that.element.find('tbody').append($tr);
          pendingEntriesExist = true

          $tr.find('input[data-property=hours]')
            .on('input change', () => {
              that.updateTotal()
            })

          $tr.find('select[data-property=activity_id]')
            .attr('data-selected', sDefaultActivityId)

          $tr.find('.cb-import')
            .on('change', () => {
              that.updateTotal()
            })
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

      // If the update was triggered from the filter form, then focus the
      // "check-all" button to allow easier keyboard navigation.
      if (that.filterForm.element.has(':focus').length > 0) {
        that.checkAll.trigger('focus')
      }
    })
  }

  /**
   * Updates the link to the Toggl report page.
   *
   * @param date
   *   Report date.
   * @param workspaceId
   *   Toggl workspace ID.
   */
  private updateLink(date: datetime.DateTime, workspaceId: number | null) {
    workspaceId = workspaceId || 0
    const url = `https://track.toggl.com/reports/summary/${workspaceId}/from/${date.toHTMLDateString()}/to/${date.toHTMLDateString()}`
    $('#toggl-report-link').attr('href', url)
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

class Application {

  /**
   * Browser storage.
   */
  readonly localStorage: LocalStorage

  readonly redmineAPI: RedmineAPIService

  /**
   * The form containing filters and options.
   */
  readonly filterForm: FilterForm

  /**
   * The form containing the "import to redmine" button.
   */
  readonly importForm: ImportForm

  /**
   * The table containing Redmine time entries.
   */
  readonly redmineReport: RedmineReport

  /**
   * The table containing Toggl time entries.
   */
  readonly togglReport: TogglReport

  static _instance?: Application

  public constructor(
    redmineAPI: RedmineAPIService,
    localStorage: LocalStorage | undefined = undefined,
    filterForm: FilterForm | undefined = undefined,
    redmineReport: RedmineReport | undefined = undefined,
    togglReport: TogglReport | undefined = undefined,
    importForm: ImportForm | undefined = undefined
  ) {
    this.redmineAPI = redmineAPI
    this.localStorage = localStorage || new LocalStorage('toggl2redmine.')
    this.filterForm = filterForm || new FilterForm(
      document.getElementById('filter-form') as HTMLElement,
      this.localStorage
    )
    this.redmineReport = redmineReport || new RedmineReport(
      document.getElementById('redmine-report') as HTMLElement,
      this.filterForm,
      this.redmineAPI
    )
    this.togglReport = togglReport || new TogglReport(
      document.getElementById('toggl-report') as HTMLElement,
      this.filterForm,
      this.redmineAPI
    )
    this.importForm = importForm || new ImportForm(
      document.getElementById('import-form') as HTMLElement,
      this.filterForm,
      this.redmineAPI,
      this.redmineReport,
      this.togglReport
    )
  }

  static instance(): Application {
    if (!Application._instance) {
      Application._instance = new Application(
        new RedmineAPIService(T2R_REDMINE_API_KEY)
      )
    }

    return Application._instance as Application
  }

  public initialize() {
    this.filterForm.reset({ date: utils.getDateFromLocationHash() })
  }

}

/**
 * Execute the Toggl2Redmine application.
 */
$(() => {
  widget.initialize()
  Application.instance().initialize()
})
