import { LocalStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineAPIService } from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
class PublishForm {
    constructor(element, filterForm, redmineAPI) {
        const that = this;
        this.element = $(element);
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
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
        if (Application.instance().togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
            flash.error(t('t2r.error.no_entries_selected'));
            this.enable();
            return;
        }
        console.info('Sending time entries to Redmine.');
        Application.instance().togglReport.element.find('tbody tr').each(function () {
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
                    Application.instance().publishForm.enable();
                    Application.instance().redmineReport.update();
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
        this.element = $(element);
        this.localStorage = localStorage;
        this.init();
    }
    getDefaults() {
        const values = {};
        values['date'] = (new datetime.DateTime).toHTMLDate();
        const workspaceId = this.localStorage.get('toggl-workspace');
        if (workspaceId) {
            values['toggl-workspace'] = parseInt(workspaceId);
        }
        const defaultActivityId = this.localStorage.get('default-activity');
        if (defaultActivityId) {
            values['default-activity'] = parseInt(defaultActivityId);
        }
        const roundingValue = this.localStorage.get('rounding-value') || '0';
        values['rounding-value'] = parseInt(roundingValue);
        const roundingDirection = this.localStorage.get('rounding-direction') || undefined;
        if (typeof roundingDirection !== 'undefined') {
            values['rounding-direction'] = roundingDirection;
        }
        return values;
    }
    getValues() {
        const values = {};
        const $defaultActivityId = $('select#default-activity');
        const defaultActivityId = $defaultActivityId.val() || $defaultActivityId.data('selected');
        if (defaultActivityId) {
            values['default-activity'] = parseInt(defaultActivityId);
        }
        const $togglWorkspaceId = $('select#toggl-workspace');
        const togglWorkspaceId = $togglWorkspaceId.val() || $togglWorkspaceId.data('selected');
        if (togglWorkspaceId) {
            values['toggl-workspace'] = togglWorkspaceId;
        }
        const sRoundingValue = $('input#rounding-value').val();
        const nRoundingValue = parseInt(sRoundingValue);
        if (sRoundingValue && !isNaN(nRoundingValue)) {
            values['rounding-value'] = parseInt(sRoundingValue);
        }
        const roundingMethod = $('select#rounding-direction').val();
        if (roundingMethod) {
            values['rounding-direction'] = roundingMethod;
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
                case 'default-activity':
                    if (!values['default-activity'])
                        return;
                    $field
                        .data('selected', values['default-activity'])
                        .val(values['default-activity']);
                    break;
                case 'toggl-workspace':
                    if (!values['toggl-workspace'])
                        return;
                    $field
                        .data('selected', values['toggl-workspace'])
                        .val(values['toggl-workspace']);
                    break;
                case 'rounding-direction':
                    if (!values['rounding-direction'])
                        return;
                    $field.val(values['rounding-direction']);
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
    init() {
        const $form = this.element;
        const that = this;
        $form.find('#btn-apply-filters')
            .on('click', () => {
            return that.onSubmit();
        });
        $form.find('#btn-reset-filters')
            .on('click', () => {
            that.reset();
            return false;
        });
        $form.on('submit', (e) => {
            e.preventDefault();
            return that.onSubmit();
        });
    }
    reset(values = {}) {
        const defaults = this.getDefaults();
        if (!values['date']) {
            values['date'] = defaults['date'];
        }
        if (!values['default-activity']) {
            values['default-activity'] = defaults['default-activity'];
        }
        if (!values['toggl-workspace']) {
            values['toggl-workspace'] = defaults['toggl-workspace'];
        }
        if (!values['rounding-direction']) {
            values['rounding-direction'] = defaults['rounding-direction'];
        }
        if (!values['rounding-value']) {
            values['rounding-value'] = defaults['rounding-value'];
        }
        this.element.find(':input').val('');
        this.setValues(values);
        this.onSubmit();
    }
    onSubmit() {
        const redmineReport = Application.instance().redmineReport;
        const togglReport = Application.instance().togglReport;
        const publishForm = Application.instance().publishForm;
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
        this.localStorage.set('default-activity', values['default-activity']);
        this.localStorage.set('toggl-workspace', values['toggl-workspace']);
        this.localStorage.set('rounding-value', values['rounding-value']);
        this.localStorage.set('rounding-direction', values['rounding-direction']);
        console.info('Filter updated', values);
        window.location.hash = oDate.toHTMLDate();
        $('h2 .date').html('(' + oDate.date.toLocaleDateString() + ')');
        setTimeout(() => {
            redmineReport.update();
            togglReport.update();
        }, 250);
        publishForm.enable();
        return false;
    }
}
class RedmineReport {
    constructor(element, filterForm, redmineAPI) {
        this.element = $(element);
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
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
        this.element = $(element);
        this.checkAll = this.element.find('input.check-all');
        this.filterForm = filterForm;
        this.redmineAPI = redmineAPI;
        this.init();
    }
    init() {
        const that = this;
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
        Application.instance().publishForm.disable();
        this.showLoader();
        this.makeEmpty();
        const sDate = filterFormValues['date'];
        const oDate = datetime.DateTime.fromString(sDate);
        const workspaceId = filterFormValues['toggl-workspace'];
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
            const roundingMethod = filterFormValues['rounding-direction'];
            for (const key in entries) {
                const entry = entries[key];
                entry.duration = new datetime.Duration(Math.max(0, entry.duration));
                entry.roundedDuration = new datetime.Duration(entry.duration.seconds);
                if (roundingMethod && roundingValue > 0) {
                    entry.roundedDuration.roundTo(roundingValue, roundingMethod);
                }
                else {
                    entry.roundedDuration.roundTo(1, datetime.RoundingMethod.Regular);
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
            const sDefaultActivityId = filterFormValues['default-activity']
                ? filterFormValues['default-activity'].toString() : '';
            for (const key in entries) {
                const entry = entries[key];
                if (entry.status === 'pending' && entry.errors.length === 0) {
                    const $tr = renderers.renderTogglRow(entry);
                    that.element.find('tbody').append($tr);
                    pendingEntriesExist = true;
                    $tr.find('input[data-property=hours]')
                        .on('input change', () => {
                        Application.instance().togglReport.updateTotal();
                    });
                    $tr.find('select[data-property=activity_id]')
                        .attr('data-selected', sDefaultActivityId);
                    $tr.find('.cb-import')
                        .on('change', () => {
                        Application.instance().togglReport.updateTotal();
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
            Application.instance().publishForm.enable();
            if (Application.instance().filterForm.element.has(':focus').length > 0) {
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
    constructor(redmineAPI, redmineReport = undefined, togglReport = undefined, publishForm = undefined, filterForm = undefined, localStorage = undefined) {
        this.localStorage = localStorage || new LocalStorage('toggl2redmine.');
        this.redmineAPI = redmineAPI;
        this.filterForm = filterForm || new FilterForm(document.getElementById('filter-form'), this.localStorage);
        this.togglReport = togglReport || new TogglReport(document.getElementById('toggl-report'), this.filterForm, this.redmineAPI);
        this.redmineReport = redmineReport || new RedmineReport(document.getElementById('redmine-report'), this.filterForm, this.redmineAPI);
        this.publishForm = publishForm || new PublishForm(document.getElementById('publish-form'), this.filterForm, this.redmineAPI);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBQzVDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUE7QUFFMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFLZixZQUFtQixPQUFvQixFQUFFLFVBQXNCLEVBQUUsVUFBNkI7UUFDNUYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBRTVCLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ2YsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFTSxRQUFRO1FBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUVwRCxJQUFJ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