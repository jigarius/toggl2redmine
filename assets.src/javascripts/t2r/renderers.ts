import * as models from './models.js'
import * as utils from './utils.js'
import * as datetime from './datetime.js'

declare const T2R_BUTTON_ACTIONS: string
declare const contextMenuRightClick: { (): void }

export function renderRedmineProjectLabel(project: models.Project): string {
  const classes = ['project'];
  if (project.status != 1) {
    classes.push('closed')
  }

  return '<a href="' + project.path + '" class="' + classes.join(' ') + '"><strong>'
    + utils.htmlEntityEncode(project.name)
    + '</strong></a>';
}

export function renderRedmineProjectStubLabel(): string {
  return '<span class="project unknown">-</span>'
}

export function renderRedmineIssueLabel(issue: models.Issue): string {
  return '<a href="' + issue.path + '" target="_blank">'
    + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
    + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
    + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
    + '</a>'
}

export function renderRedmineIssueStubLabel(issueId: number | null): string {
  if (!issueId) {
    return 'Unknown'
  }

  return '#' + issueId.toString() + ': -'
}

export function renderTogglRow(data: models.TogglTimeEntry): JQuery<HTMLElement> {
  const issue = data.issue
  const issueLabel: string = issue ? renderRedmineIssueLabel(issue) : renderRedmineIssueStubLabel(data.issue_id)
  const project = data.project || null
  const projectLabel = project ? renderRedmineProjectLabel(project) : renderRedmineProjectStubLabel()
  const oDuration = data.duration as datetime.Duration
  const rDuration = data.roundedDuration as datetime.Duration

  const markup = '<tr data-t2r-widget="TogglRow">'
    + '<td class="checkbox"><input class="cb-import" type="checkbox" value="1" title="Check this box if you want to import this entry." /></td>'
    + '<td class="status"></td>'
    + '<td class="issue">'
    + '<input data-property="issue_id" type="hidden" '
    + 'data-value="' + utils.htmlEntityEncode(issue ? issue.id.toString() : '') + '" '
    + 'value="' + utils.htmlEntityEncode(issue ? issue.id.toString() : '') + '" />'
    + projectLabel + '<br />' + issueLabel
    + '</td>'
    + '<td class="comments">'
    + '<input data-property="comments" type="text" value="' + utils.htmlEntityEncode(data.comments) + '" maxlength="255" />'
    + '</td>'
    + '<td class="activity">'
    + '<select data-property="activity_id" required="required" data-placeholder="-" data-t2r-widget="RedmineActivityDropdown"></select>'
    + '</td>'
    + '<td class="hours">'
    + '<input data-property="hours" required="required" data-t2r-widget="DurationInput" type="text" title="Value as on Toggl is ' + oDuration.asHHMM() + '." value="' + rDuration.asHHMM() + '" size="6" maxlength="5" />'
    + '</td>'
    + '</tr>';

  // Attach the entry for reference.
  const $tr = $(markup);
  $tr.data('t2r.entry', data);

  let statusLabel: HTMLElement | null = null

  switch (data.status) {
    case 'pending':
      if (data.errors.length > 0) {
        $tr.addClass('t2r-error');
        $tr.find(':input').attr('disabled', 'disabled');
        statusLabel = renderImportStatusLabel('Invalid', data.errors.join("\n"), 'error')
      }
      break;

    case 'imported':
      $tr.find('.cb-import').removeAttr('checked');
      $tr.addClass('t2r-success');
      $tr.find(':input').attr('disabled', 'disabled');
      statusLabel = renderImportStatusLabel('Imported')
      break;

    case 'running':
      $tr.addClass('t2r-running');
      $tr.find(':input').attr('disabled', 'disabled');
      statusLabel = renderImportStatusLabel(
        'Running',
        'The timer is still running on Toggl.',
        'error'
      )
      break;

    default:
      throw `Unrecognized status: ${data.status}.`
  }

  if (statusLabel) {
    $tr.find('td.status').html(statusLabel)
  }

  return $tr;
}

export function renderRedmineRow(data: models.TimeEntry): JQuery<HTMLElement> {
  const issue = data.issue
  const issueLabel = renderRedmineIssueLabel(issue)
  const project = data.project
  const projectLabel = renderRedmineProjectLabel(project)
  const oDuration = data.duration
  oDuration.roundTo(1, datetime.RoundingMethod.Up)

  const markup = '<tr id="time-entry-' + data.id + '"  class="time-entry hascontextmenu">'
    + '<td class="subject">'
    + projectLabel + '<br />' + issueLabel
    + '<input type="checkbox" name="ids[]" value="' + data.id + '" hidden />'
    + '</td>'
    + '<td class="comments">' + utils.htmlEntityEncode(data.comments) + '</td>'
    + '<td class="activity">' + utils.htmlEntityEncode(data.activity.name) + '</td>'
    + '<td class="hours">' + oDuration.asHHMM() + '</td>'
    + '<td class="buttons">' + T2R_BUTTON_ACTIONS + '</td>'
    + '</tr>';

  const $tr = $(markup)
  $tr.find('.js-contextmenu').on('click', contextMenuRightClick)

  return $tr
}

/**
 * Returns an import status label element.
 *
 * @param {string} label
 *   A label.
 * @param {string} description
 *   A description (displayed as tooltip).
 * @param {string} icon
 *   An icon. One of checked, error, warn.
 *
 * @return {HTMLElement}
 *   A span element.
 */
export function renderImportStatusLabel(
  label: string,
  description: string | null = null,
  icon = 'checked'
): HTMLElement {
  const el = document.createElement('span')

  el.innerHTML = label
  el.dataset.t2rWidget = 'Tooltip'
  el.classList.add('icon', `icon-${icon}`)
  if (description) {
    el.setAttribute('title', description)
  }

  return el
}
