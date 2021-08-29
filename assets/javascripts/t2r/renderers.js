import * as utils from './utils.js';
import * as datetime from './datetime.js';
export function renderRedmineProjectLabel(project) {
    const classes = ['project'];
    if (project.status != 1) {
        classes.push('closed');
    }
    return '<a href="' + project.path + '" class="' + classes.join(' ') + '"><strong>'
        + utils.htmlEntityEncode(project.name)
        + '</strong></a>';
}
export function renderRedmineProjectStubLabel() {
    return '<span class="project unknown">-</span>';
}
export function renderRedmineIssueLabel(issue) {
    return '<a href="' + issue.path + '" target="_blank">'
        + utils.htmlEntityEncode(issue ? issue.tracker.name : '-')
        + utils.htmlEntityEncode(issue ? ' #' + issue.id : '')
        + utils.htmlEntityEncode(issue.subject ? ': ' + issue.subject : '')
        + '</a>';
}
export function renderRedmineIssueStubLabel(issueId) {
    if (!issueId) {
        return 'Unknown';
    }
    return '#' + issueId.toString() + ': -';
}
export function renderTogglRow(data) {
    const issue = data.issue;
    const issueLabel = issue ? renderRedmineIssueLabel(issue) : renderRedmineIssueStubLabel(data.issue_id);
    const project = data.project || null;
    const projectLabel = project ? renderRedmineProjectLabel(project) : renderRedmineProjectStubLabel();
    const oDuration = data.duration;
    const rDuration = data.roundedDuration;
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
    const $tr = $(markup);
    $tr.data('t2r.entry', data);
    let statusLabel = null;
    switch (data.status) {
        case 'pending':
            if (data.errors.length > 0) {
                $tr.addClass('t2r-error');
                $tr.find(':input').attr('disabled', 'disabled');
                statusLabel = renderImportStatusLabel('Invalid', data.errors.join("\n"), 'error');
            }
            break;
        case 'imported':
            $tr.find('.cb-import').removeAttr('checked');
            $tr.addClass('t2r-success');
            $tr.find(':input').attr('disabled', 'disabled');
            statusLabel = renderImportStatusLabel('Imported');
            break;
        case 'running':
            $tr.addClass('t2r-running');
            $tr.find(':input').attr('disabled', 'disabled');
            statusLabel = renderImportStatusLabel('Running', 'The timer is still running on Toggl.', 'error');
            break;
        default:
            throw `Unrecognized status: ${data.status}.`;
    }
    if (statusLabel) {
        $tr.find('td.status').html(statusLabel);
    }
    return $tr;
}
export function renderRedmineRow(data) {
    const issue = data.issue;
    const issueLabel = renderRedmineIssueLabel(issue);
    const project = data.project;
    const projectLabel = renderRedmineProjectLabel(project);
    const oDuration = data.duration;
    oDuration.roundTo(1, datetime.RoundingMethod.Up);
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
    const $tr = $(markup);
    $tr.find('.js-contextmenu').on('click', contextMenuRightClick);
    return $tr;
}
export function renderImportStatusLabel(label, description = null, icon = 'checked') {
    const el = document.createElement('span');
    el.innerHTML = label;
    el.dataset.t2rWidget = 'Tooltip';
    el.classList.add('icon', `icon-${icon}`);
    if (description) {
        el.setAttribute('title', description);
    }
    return el;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIvcmVuZGVyZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sS0FBSyxLQUFLLE1BQU0sWUFBWSxDQUFBO0FBQ25DLE9BQU8sS0FBSyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBS3pDLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxPQUF1QjtJQUMvRCxNQUFNLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVCLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7UUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtLQUN2QjtJQUVELE9BQU8sV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWTtVQUM5RSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztVQUNwQyxlQUFlLENBQUM7QUFDdEIsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkI7SUFDM0MsT0FBTyx3Q0FBd0MsQ0FBQTtBQUNqRCxDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEtBQW1CO0lBQ3pELE9BQU8sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsb0JBQW9CO1VBQ2xELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7VUFDeEQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztVQUNwRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FB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