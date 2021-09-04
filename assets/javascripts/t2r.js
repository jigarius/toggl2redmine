import { LocalStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineAPIService } from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
class PublishForm {
    constructor(element, filterForm, redmineAPI, redmineReport, togglReport) {
        const that = this;
        this.element = $(element);
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
        this.redmineReport = redmineReport;
        this.togglReport = togglReport;
        this.filterForm.eventManager.on('preSubmit', function () {
            that.disable();
        });
        this.filterForm.eventManager.on('postSubmit', function () {
            that.enable();
        });
        this.element.on('submit', () => {
            that.onSubmit();
            return false;
        });
    }
    onSubmit() {
        const that = this;
        const filterFormValues = this.filterForm.getValues();
        if (!confirm('This action cannot be undone. Do you really want to continue?')) {
            return;
        }
        this.disable();
        flash.clear();
        if (this.togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
            flash.error(t('t2r.error.no_entries_selected'));
            this.enable();
            return;
        }
        console.info('Sending time entries to Redmine.');
        this.togglReport.element.find('tbody tr').each(function () {
            const $tr = $(this);
            if (!$tr.find('input.cb-import').prop('checked')) {
                return;
            }
            const timeEntry = {
                spent_on: filterFormValues['date'],
                issue_id: parseInt($tr.find('[data-property="issue_id"]').val()),
                comments: $tr.find('[data-property="comments"]').val(),
                activity_id: parseInt($tr.find('[data-property="activity_id"]').val()),
                hours: '0.00'
            };
            const dur = new datetime.Duration();
            try {
                dur.setHHMM($tr.find('[data-property="hours"]').val());
                timeEntry.hours = dur.asDecimal();
            }
            catch (e) {
                console.warn('Entry ignored: Invalid duration.', timeEntry);
                return;
            }
            if (dur.seconds < 30) {
                console.warn('Entry ignored: Duration is less than 30 seconds.', timeEntry);
                return;
            }
            that.redmineAPI.postTimeEntry({
                time_entry: timeEntry,
                toggl_ids: $tr.data('t2r.entry').ids
            }, (errors) => {
                if (that.redmineAPI.requestQueue.length === 0) {
                    that.enable();
                    that.redmineReport.update();
                }
                if (errors.length !== 0) {
                    $tr.addClass('t2r-error');
                    const statusLabel = renderers.renderImportStatusLabel('Failed', errors.join("\n"), 'error');
                    $tr.find('td.status').html(statusLabel);
                    return;
                }
                $tr.addClass('t2r-success');
                $tr.find(':input').attr('disabled', 'disabled');
                $tr.find('input.cb-import').removeAttr('checked');
                const statusLabel = renderers.renderImportStatusLabel('Imported');
                $tr.find('td.status').html(statusLabel);
            });
        });
    }
    disable() {
        this.element.find('#btn-publish').attr('disabled', 'disabled');
    }
    enable() {
        this.element.find('#btn-publish').removeAttr('disabled');
    }
}
class FilterForm {
    constructor(element, localStorage) {
        const that = this;
        this.element = $(element);
        this.localStorage = localStorage;
        this.eventManager = new utils.EventManager();
        this.element.find('#btn-apply-filters')
            .on('click', () => {
            return that.onSubmit();
        });
        this.element.find('#btn-reset-filters')
            .on('click', () => {
            that.reset();
            return false;
        });
        this.element.on('submit', (e) => {
            e.preventDefault();
            return that.onSubmit();
        });
    }
    getDefaults() {
        const values = {};
        values['date'] = (new datetime.DateTime).toHTMLDate();
        const workspaceId = this.localStorage.get('toggl-workspace-id');
        if (workspaceId) {
            values['toggl-workspace-id'] = parseInt(workspaceId);
        }
        const defaultActivityId = this.localStorage.get('default-activity-id');
        if (defaultActivityId) {
            values['default-activity-id'] = parseInt(defaultActivityId);
        }
        const roundingValue = this.localStorage.get('rounding-value') || '0';
        values['rounding-value'] = parseInt(roundingValue);
        const roundingMethod = this.localStorage.get('rounding-method');
        if (roundingMethod) {
            values['rounding-method'] = roundingMethod;
        }
        return values;
    }
    getValues() {
        const values = {};
        const $defaultActivityId = $('select#default-activity-id');
        const defaultActivityId = $defaultActivityId.val();
        if (defaultActivityId) {
            values['default-activity-id'] = parseInt(defaultActivityId);
        }
        const $togglWorkspaceId = $('select#toggl-workspace-id');
        const togglWorkspaceId = $togglWorkspaceId.val() || $togglWorkspaceId.data('selected');
        if (togglWorkspaceId) {
            values['toggl-workspace-id'] = togglWorkspaceId;
        }
        const sRoundingValue = $('input#rounding-value').val();
        const nRoundingValue = parseInt(sRoundingValue);
        if (sRoundingValue && !isNaN(nRoundingValue)) {
            values['rounding-value'] = parseInt(sRoundingValue);
        }
        const roundingMethod = $('select#rounding-method').val();
        if (roundingMethod) {
            values['rounding-method'] = roundingMethod;
        }
        const sDate = $('#date').val();
        try {
            datetime.DateTime.fromString(sDate);
            values['date'] = sDate;
        }
        catch (e) {
            console.error(e);
        }
        return values;
    }
    setValues(values) {
        this.element
            .find(':input')
            .each(function () {
            const $field = $(this);
            const name = $field.attr('name');
            if (!name)
                return;
            switch (name) {
                case 'date':
                    if (!values['date'])
                        return;
                    $field.val(values['date']);
                    break;
                case 'default-activity-id':
                    if (!values['default-activity-id'])
                        return;
                    $field
                        .data('selected', values['default-activity-id'])
                        .val(values['default-activity-id']);
                    break;
                case 'toggl-workspace-id':
                    if (!values['toggl-workspace-id'])
                        return;
                    $field
                        .data('selected', values['toggl-workspace-id'])
                        .val(values['toggl-workspace-id']);
                    break;
                case 'rounding-method':
                    if (!values['rounding-method'])
                        return;
                    $field.val(values['rounding-method']);
                    break;
                case 'rounding-value':
                    if (!values['rounding-value'])
                        return;
                    $field.val(values['rounding-value']);
                    break;
                default:
                    throw `Unexpected field: ${name}`;
            }
        });
    }
    reset(values = {}) {
        const defaults = this.getDefaults();
        if (!values['date']) {
            values['date'] = defaults['date'];
        }
        if (!values['default-activity-id']) {
            values['default-activity-id'] = defaults['default-activity-id'];
        }
        if (!values['toggl-workspace-id']) {
            values['toggl-workspace-id'] = defaults['toggl-workspace-id'];
        }
        if (!values['rounding-method']) {
            values['rounding-method'] = defaults['rounding-method'];
        }
        if (!values['rounding-value']) {
            values['rounding-value'] = defaults['rounding-value'];
        }
        this.element.find(':input').val('');
        this.setValues(values);
        this.onSubmit();
    }
    onSubmit() {
        this.eventManager.trigger('preSubmit');
        const values = this.getValues();
        if (!values['date']) {
            this.element.find('#date').trigger('focus');
            return false;
        }
        const oDate = datetime.DateTime.fromString(values['date']);
        if (!oDate) {
            alert('Please enter a valid date.');
            this.element.find('#date').trigger('focus');
            return false;
        }
        this.localStorage.set('default-activity-id', values['default-activity-id']);
        this.localStorage.set('toggl-workspace-id', values['toggl-workspace-id']);
        this.localStorage.set('rounding-value', values['rounding-value']);
        this.localStorage.set('rounding-method', values['rounding-method']);
        console.info('Filter updated', values);
        window.location.hash = oDate.toHTMLDate();
        $('h2 .date').html('(' + oDate.date.toLocaleDateString() + ')');
        this.eventManager.trigger('postSubmit');
        return false;
    }
}
class RedmineReport {
    constructor(element, filterForm, redmineAPI) {
        const that = this;
        this.element = $(element);
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
        this.filterForm.eventManager.on('postSubmit', function () {
            that.update();
        });
    }
    update() {
        const that = this;
        this.showLoader();
        this.makeEmpty();
        const sDate = this.filterForm.getValues()['date'];
        const oDate = datetime.DateTime.fromString(sDate);
        this.updateLink(oDate);
        this.updateLastImportDate();
        const query = { from: oDate, till: oDate };
        this.redmineAPI.getTimeEntries(query, (entries) => {
            if (entries === null) {
                entries = [];
            }
            if (entries.length === 0) {
                that.showEmptyMessage();
            }
            for (const time_entry of entries) {
                const markup = renderers.renderRedmineRow(time_entry);
                that.element.find('tbody').append(markup);
            }
            that.updateTotal();
            that.hideLoader();
        });
    }
    updateLink(date) {
        const url = `/time_entries?utf8=✓&set_filter=1&sort=spent_on:desc&f[]=spent_on&op[spent_on]=%3D&v[spent_on][]=[${date.toHTMLDate()}]&f[]=user_id&op[user_id]=%3D&v[user_id][]=me&c[]=project&c[]=spent_on&c[]=user&c[]=activity&c[]=issue&c[]=comments&c[]=hours&group_by=spent_on&t[]=hours&t[]=`;
        $('#redmine-report-link').attr('href', url);
    }
    updateTotal() {
        const total = new datetime.Duration();
        this.element.find('tbody tr .hours')
            .each(function () {
            const hours = $(this).text().trim();
            if (hours.length > 0) {
                total.add(new datetime.Duration(hours));
            }
        });
        this.element.find('[data-property="total-hours"]').html(total.asHHMM());
    }
    updateLastImportDate() {
        const $el = $('#last-imported')
            .html('&nbsp;')
            .addClass('t2r-loading');
        this.redmineAPI.getLastImportDate((lastImportDate) => {
            const sDate = lastImportDate ? lastImportDate.date.toLocaleDateString() : 'Unknown';
            $el.text(sDate).removeClass('t2r-loading');
        });
    }
    showEmptyMessage() {
        const colspan = this.element.find('thead tr:first th').length;
        const message = t('t2r.error.list_empty');
        const markup = `<tr><td colspan="${colspan}">${message}</td></tr>`;
        this.element.find('tbody').html(markup);
    }
    makeEmpty() {
        this.element.find('tbody').html('');
    }
    showLoader() {
        this.element.addClass('t2r-loading');
    }
    hideLoader() {
        this.element.removeClass('t2r-loading');
    }
}
class TogglReport {
    constructor(element, filterForm, redmineAPI) {
        const that = this;
        this.element = $(element);
        this.checkAll = this.element.find('input.check-all');
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
        this.filterForm.eventManager.on('postSubmit', function () {
            that.update();
        });
        this.checkAll
            .on('change', () => {
            const checked = $(that.checkAll).prop('checked');
            that.element.find('tbody input.cb-import:enabled')
                .prop('checked', checked)
                .trigger('change');
        });
    }
    update() {
        const that = this;
        const filterFormValues = this.filterForm.getValues();
        this.showLoader();
        this.makeEmpty();
        const sDate = filterFormValues['date'];
        const oDate = datetime.DateTime.fromString(sDate);
        const workspaceId = filterFormValues['toggl-workspace-id'];
        this.updateLink(oDate, workspaceId);
        this.checkAll
            .prop('checked', false)
            .attr('disabled', 'disabled');
        const query = {
            from: datetime.DateTime.fromString(sDate + ' 00:00:00'),
            till: datetime.DateTime.fromString(sDate + ' 23:59:59'),
            workspaceId: workspaceId
        };
        this.redmineAPI.getTogglTimeEntries(query, (entries) => {
            let pendingEntriesExist = false;
            const roundingValue = filterFormValues['rounding-value'];
            const roundingMethod = filterFormValues['rounding-method'];
            for (const key in entries) {
                const entry = entries[key];
                entry.duration = new datetime.Duration(Math.max(0, entry.duration));
                entry.roundedDuration = new datetime.Duration(entry.duration.seconds);
                if (roundingMethod && roundingValue > 0) {
                    entry.roundedDuration.roundTo(roundingValue, roundingMethod);
                }
                else {
                    entry.roundedDuration.roundTo(1, datetime.DurationRoundingMethod.Regular);
                }
                entries[key] = entry;
            }
            if (entries === {}) {
                this.showEmptyMessage();
            }
            for (const key in entries) {
                const entry = entries[key];
                if (entry.status === 'running') {
                    const $tr = renderers.renderTogglRow(entry);
                    that.element.find('tbody').append($tr);
                    delete entries[key];
                }
            }
            const sDefaultActivityId = filterFormValues['default-activity-id']
                ? filterFormValues['default-activity-id'].toString() : '';
            for (const key in entries) {
                const entry = entries[key];
                if (entry.status === 'pending' && entry.errors.length === 0) {
                    const $tr = renderers.renderTogglRow(entry);
                    that.element.find('tbody').append($tr);
                    pendingEntriesExist = true;
                    $tr.find('input[data-property=hours]')
                        .on('input change', () => {
                        that.updateTotal();
                    });
                    $tr.find('select[data-property=activity_id]')
                        .attr('data-selected', sDefaultActivityId);
                    $tr.find('.cb-import')
                        .on('change', () => {
                        that.updateTotal();
                    });
                }
            }
            for (const key in entries) {
                const entry = entries[key];
                if (entry.status === 'pending' && entry.errors.length > 0) {
                    const $tr = renderers.renderTogglRow(entry);
                    that.element.find('tbody').append($tr);
                }
            }
            for (const key in entries) {
                const entry = entries[key];
                if (entry.status === 'imported') {
                    const $tr = renderers.renderTogglRow(entry);
                    that.element.find('tbody').append($tr);
                }
            }
            that.updateTotal();
            widget.initialize(that.element[0]);
            that.hideLoader();
            if (!pendingEntriesExist) {
                return;
            }
            that.checkAll.removeAttr('disabled');
            if (that.filterForm.element.has(':focus').length > 0) {
                that.checkAll.trigger('focus');
            }
        });
    }
    updateLink(date, workspaceId) {
        workspaceId = workspaceId || 0;
        const url = `https://track.toggl.com/reports/summary/${workspaceId}/from/${date.toHTMLDate()}/to/${date.toHTMLDate()}`;
        $('#toggl-report-link').attr('href', url);
    }
    updateTotal() {
        const total = new datetime.Duration();
        this.element.find('tbody tr').each(function () {
            const $tr = $(this);
            const dur = new datetime.Duration();
            if ($tr.hasClass('t2r-error')) {
                return;
            }
            if (!$tr.find('.cb-import').is(':checked')) {
                return;
            }
            const hours = $tr.find('[data-property="hours"]').val();
            try {
                dur.setHHMM(hours);
                total.add(dur);
            }
            catch (e) {
                console.error(e);
            }
        });
        this.element.find('[data-property="total-hours"]').html(total.asHHMM());
    }
    showEmptyMessage() {
        const colspan = this.element.find('thead tr:first th').length;
        const message = t('t2r.error.list_empty');
        const markup = `<tr><td colspan="${colspan}">${message}</td></tr>`;
        this.element.find('tbody').html(markup);
    }
    makeEmpty() {
        this.element.find('tbody').html('');
    }
    showLoader() {
        this.element.addClass('t2r-loading');
    }
    hideLoader() {
        this.element.removeClass('t2r-loading');
    }
}
class Application {
    constructor(redmineAPI, localStorage = undefined, filterForm = undefined, redmineReport = undefined, togglReport = undefined, publishForm = undefined) {
        this.redmineAPI = redmineAPI;
        this.localStorage = localStorage || new LocalStorage('toggl2redmine.');
        this.filterForm = filterForm || new FilterForm(document.getElementById('filter-form'), this.localStorage);
        this.redmineReport = redmineReport || new RedmineReport(document.getElementById('redmine-report'), this.filterForm, this.redmineAPI);
        this.togglReport = togglReport || new TogglReport(document.getElementById('toggl-report'), this.filterForm, this.redmineAPI);
        this.publishForm = publishForm || new PublishForm(document.getElementById('publish-form'), this.filterForm, this.redmineAPI, this.redmineReport, this.togglReport);
    }
    static instance() {
        if (!Application._instance) {
            Application._instance = new Application(new RedmineAPIService(T2R_REDMINE_API_KEY));
        }
        return Application._instance;
    }
    initialize() {
        this.filterForm.reset({ date: utils.getDateFromLocationHash() });
    }
}
$(() => {
    widget.initialize();
    Application.instance().initialize();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBQzVDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUE7QUFFMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFPZixZQUNFLE9BQW9CLEVBQ3BCLFVBQXNCLEVBQ3RCLFVBQTZCLEVBQzdCLGFBQTRCLEVBQzVCLFdBQXdCO1FBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUU5QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQzNDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUs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