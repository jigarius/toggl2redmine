import { LocalStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineAPIService } from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
class ImportForm {
    constructor(element, filterForm, redmineAPI, redmineReport, togglReport) {
        const that = this;
        this.element = $(element);
        this.importButton = this.element.find('#btn-import');
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
        this.importButton.attr('disabled', 'disabled');
    }
    enable() {
        this.importButton.removeAttr('disabled');
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
        values['date'] = (new datetime.DateTime).toHTMLDateString();
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
        window.location.hash = oDate.toHTMLDateString();
        $('h2 .date').html('(' + oDate.date.toLocaleDateString() + ')');
        this.eventManager.trigger('postSubmit');
        return false;
    }
}
class RedmineReport {
    constructor(element, filterForm, redmineAPI) {
        const that = this;
        this.element = $(element);
        this.lastImported = $('#last-imported');
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
        const url = `/time_entries?utf8=✓&set_filter=1&sort=spent_on:desc&f[]=spent_on&op[spent_on]=%3D&v[spent_on][]=[${date.toHTMLDateString()}]&f[]=user_id&op[user_id]=%3D&v[user_id][]=me&c[]=project&c[]=spent_on&c[]=user&c[]=activity&c[]=issue&c[]=comments&c[]=hours&group_by=spent_on&t[]=hours&t[]=`;
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
        const that = this;
        this.lastImported
            .html('&nbsp;')
            .addClass('t2r-loading');
        this.redmineAPI.getLastImportDate((lastImportDate) => {
            const sDate = lastImportDate ? lastImportDate.date.toLocaleDateString() : 'Unknown';
            that.lastImported.text(sDate).removeClass('t2r-loading');
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
        const url = `https://track.toggl.com/reports/summary/${workspaceId}/from/${date.toHTMLDateString()}/to/${date.toHTMLDateString()}`;
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
    constructor(redmineAPI, localStorage = undefined, filterForm = undefined, redmineReport = undefined, togglReport = undefined, importForm = undefined) {
        this.redmineAPI = redmineAPI;
        this.localStorage = localStorage || new LocalStorage('toggl2redmine.');
        this.filterForm = filterForm || new FilterForm(document.getElementById('filter-form'), this.localStorage);
        this.redmineReport = redmineReport || new RedmineReport(document.getElementById('redmine-report'), this.filterForm, this.redmineAPI);
        this.togglReport = togglReport || new TogglReport(document.getElementById('toggl-report'), this.filterForm, this.redmineAPI);
        this.importForm = importForm || new ImportForm(document.getElementById('import-form'), this.filterForm, this.redmineAPI, this.redmineReport, this.togglReport);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBQzVDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUE7QUFFMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFVBQVU7SUFRZCxZQUNFLE9BQW9CLEVBQ3BCLFVBQXNCLEVBQ3RCLFVBQTZCLEVBQzdCLGFBQTRCLEVBQzVCLFdBQXdCO1FBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXBELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFBO1FBRTlCLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDM0MsSUFBSSxDQUFDLE9BQU8s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