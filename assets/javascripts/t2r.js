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
        if (roundingDirection) {
            values['rounding-direction'] = roundingDirection;
        }
        return values;
    }
    getValues() {
        const values = {};
        const $defaultActivityId = $('select#default-activity');
        const defaultActivityId = $defaultActivityId.val();
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
        this.localStorage.set('default-activity', values['default-activity']);
        this.localStorage.set('toggl-workspace', values['toggl-workspace']);
        this.localStorage.set('rounding-value', values['rounding-value']);
        this.localStorage.set('rounding-direction', values['rounding-direction']);
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
            Application.instance().publishForm.enable();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBQzVDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUE7QUFFMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFPZixZQUNFLE9BQW9CLEVBQ3BCLFVBQXNCLEVBQ3RCLFVBQTZCLEVBQzdCLGFBQTRCLEVBQzVCLFdBQXdCO1FBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUU5QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQzNDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUU7WUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQzdCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNmLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU0sUUFBUTtRQUNiLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUE7UUFFcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQywrREFBK0QsQ0FBQyxFQUFFO1lBQzdFLE9BQU07U0FDUDtRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUdiLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDMUYsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNiLE9BQU07U0FDUDtRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzdDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUduQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDaEQsT0FBTTthQUNQO1lBRUQsTUFBTSxTQUFTLEdBQUc7Z0JBQ2hCLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLENBQVc7Z0JBQzVDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLEdBQUcsRUFBWSxDQUFDO2dCQUMxRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLEdBQUcsRUFBWTtnQkFDaEUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsR0FBRyxFQUFZLENBQUM7Z0JBQ2hGLEtBQUssRUFBRSxNQUFNO2FBQ2QsQ0FBQTtZQUdELE1BQU0sR0FBRyxHQUFHLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25DLElBQUk7Z0JBQ0YsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsR0FBRyxFQUFZLENBQUMsQ0FBQTtnQkFDaEUsU0FBUyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUE7YUFDbEM7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixPQUFPLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMzRCxPQUFNO2FBQ1A7WUFHRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFO2dCQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM1RSxPQUFNO2FBQ1A7WUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUc7YUFDckMsRUFBRSxDQUFDLE1BQWdCLEVBQUUsRUFBRTtnQkFFdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUM3QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtpQkFDNUI7Z0JBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtvQkFDekIsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUMzRixHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtvQkFFdkMsT0FBTTtpQkFDUDtnQkFFRCxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBRWpELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDekMsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFLTSxPQUFPO1FBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBS00sTUFBTTtRQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0NBQ0Y7QUFhRCxNQUFNLFVBQVU7SUFLZCxZQUFtQixPQUFvQixFQUFFLFlBQTBCO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNoQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRzVDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2FBQ3BDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUFBO1FBR0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7YUFDcEMsRUFBRSxDQUFDLE9BQU8sRUFBQyxHQUFHLEVBQUU7WUFDZixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDWixPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBR0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLFdBQVc7UUFDaEIsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUVyRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzVELElBQUksV0FBVyxFQUFFO1lBQ2YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsUUFBUSxDQUFDLFdBQXFCLENBQUMsQ0FBQTtTQUM1RDtRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNuRSxJQUFJLGlCQUFpQixFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxpQkFBMkIsQ0FBQyxDQUFBO1NBQ25FO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQVcsSUFBSSxHQUFHLENBQUE7UUFDOUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRWxELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQTRCLElBQUksU0FBUyxDQUFBO1FBQzdHLElBQUksaUJBQWlCLEVBQUU7WUFDckIsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsaUJBQTRDLENBQUE7U0FDNUU7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNmLENBQUM7SUFFTSxTQUFTO1FBQ2QsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDbEQsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxRQUFRLENBQUMsaUJBQTJCLENBQUMsQ0FBQTtTQUNuRTtRQUVELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEYsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtTQUM3QztRQUVELE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsRUFBWSxDQUFBO1FBQ2hFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQyxJQUFJLGNBQWMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUM1QyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUE7U0FDcEQ7UUFFRCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxHQUFHLEVBQTZCLENBQUE7UUFDdEYsSUFBSSxjQUFjLEVBQUU7WUFDbEIsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsY0FBeUMsQ0FBQTtTQUN6RTtRQUVELE1BQU0sS0FBSyxHQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQVksQ0FBQTtRQUNoRCxJQUFJO1lBQ0YsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQTtTQUN2QjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNqQjtRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2YsQ0FBQztJQUVNLFNBQVMsQ0FBQyxNQUF3QjtRQUN2QyxJQUFJLENBQUMsT0FBTzthQUNULElBQUksQ0FBQyxRQUFRLENBQUM7YUFDZCxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQVcsQ0FBQTtZQUUxQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxPQUFNO1lBRWpCLFFBQVEsSUFBSSxFQUFFO2dCQUNaLEtBQUssTUFBTTtvQkFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzt3QkFBRSxPQUFNO29CQUUzQixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQVcsQ0FBQyxDQUFBO29CQUNwQyxNQUFLO2dCQUVQLEtBQUssa0JBQWtCO29CQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDO3dCQUFFLE9BQU07b0JBRXZDLE1BQU07eUJBQ0gsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsa0JBQWtCLENBQVcsQ0FBQzt5QkFDdEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBVyxDQUFDLENBQUE7b0JBQzVDLE1BQUs7Z0JBRVAsS0FBSyxpQkFBaUI7b0JBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUM7d0JBQUUsT0FBTTtvQkFFdEMsTUFBTTt5QkFDSCxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBVyxDQUFDO3lCQUNyRCxHQUFHLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFXLENBQUMsQ0FBQTtvQkFDM0MsTUFBSztnQkFFUCxLQUFLLG9CQUFvQjtvQkFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQzt3QkFBRSxPQUFNO29CQUV6QyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBVyxDQUFDLENBQUE7b0JBQ2xELE1BQUs7Z0JBRVAsS0FBSyxnQkFBZ0I7b0JBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7d0JBQUUsT0FBTTtvQkFFckMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQVcsQ0FBQyxDQUFBO29CQUM5QyxNQUFLO2dCQUVQO29CQUNFLE1BQU0scUJBQXFCLElBQUksRUFBRSxDQUFBO2FBQ3BDO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sS0FBSyxDQUFDLFNBQTJCLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBRW5DLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtTQUNsQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsRUFBRTtZQUMvQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtTQUMxRDtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUM5QixNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtTQUN4RDtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRTtZQUNqQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtTQUM5RDtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUM3QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtTQUN0RDtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRU0sUUFBUTtRQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMzQyxPQUFPLEtBQUssQ0FBQTtTQUNiO1FBR0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDMUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMzQyxPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDakUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtRQUV6RSxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN6QyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFFL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFdkMsT0FBTyxLQUFLLENBQUE7SUFDZCxDQUFDO0NBQ0Y7QUFLRCxNQUFNLGFBQWE7SUFNakIsWUFBbUIsT0FBb0IsRUFBRSxVQUFzQixFQUFFLFVBQTZCO1FBQzVGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUU1QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFO1lBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVNLE1BQU07UUFDWCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFFakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUVoQixNQUFNLEtBQUssR0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLE1BQU0sQ0FBVyxDQUFBO1FBQ25FLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWpELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFM0IsTUFBTSxLQUFLLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFrQyxFQUFFLEVBQUU7WUFDM0UsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUNwQixPQUFPLEdBQUcsRUFBRSxDQUFBO2FBQ2I7WUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTthQUN4QjtZQUVELEtBQUssTUFBTSxVQUFVLElBQUksT0FBTyxFQUFFO2dCQUNoQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTthQUMxQztZQUVELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNsQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBUU8sVUFBVSxDQUFDLElBQXVCO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLHFHQUFxRyxJQUFJLENBQUMsVUFBVSxFQUFFLGdLQUFnSyxDQUFBO1FBQ2xTLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVNLFdBQVc7UUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7UUFHckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7YUFDakMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDekM7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVKLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFLTSxvQkFBb0I7UUFDekIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO2FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUM7YUFDZCxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGNBQXdDLEVBQUUsRUFBRTtZQUM3RSxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ25GLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVNLGdCQUFnQjtRQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUM3RCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsT0FBTyxLQUFLLE9BQU8sWUFBWSxDQUFBO1FBQ2xFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8sU0FBUztRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRU0sVUFBVTtRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFTSxVQUFVO1FBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDekMsQ0FBQztDQUNGO0FBRUQsTUFBTSxXQUFXO0lBTWYsWUFBbUIsT0FBb0IsRUFBRSxVQUFzQixFQUFFLFVBQTZCO1FBQzVGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFFNUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRTtZQUM1QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxRQUFRO2FBQ1YsRUFBRSxDQUFDLFFBQVEsRUFBQyxHQUFHLEVBQUU7WUFDaEIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUM7aUJBQy9DLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDO2lCQUN4QixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sTUFBTTtRQUNYLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUE7UUFHcEQsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDakIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBR2hCLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBVyxDQUFBO1FBQ2hELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixDQUFrQixDQUFBO1FBRXhFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBR25DLElBQUksQ0FBQyxRQUFRO2FBQ1YsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUM7YUFDdEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUcvQixNQUFNLEtBQUssR0FBRztZQUNaLElBQUksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1lBQ3ZELElBQUksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1lBQ3ZELFdBQVcsRUFBRSxXQUFXO1NBQ3pCLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDLE9BQTZDLEVBQUUsRUFBRTtZQUMzRixJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtZQUcvQixNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBVyxDQUFBO1lBQ2xFLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLG9CQUFvQixDQUE0QixDQUFBO1lBR3hGLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO2dCQUN6QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRTFCLEtBQUssQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFrQixDQUFDLENBQUMsQ0FBQTtnQkFDN0UsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFHckUsSUFBSSxjQUFjLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRTtvQkFDdkMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO2lCQUM3RDtxQkFDSTtvQkFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtpQkFDbEU7Z0JBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTthQUNyQjtZQUVELElBQUksT0FBTyxLQUFLLEVBQUUsRUFBRTtnQkFDbEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7YUFDeEI7WUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtnQkFDekIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNyQjthQUNGO1lBRUQsTUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDN0QsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUd4RCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtnQkFDekIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDM0QsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2QyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7b0JBRTFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUM7eUJBQ25DLEVBQUUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO3dCQUN2QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7b0JBQ3BCLENBQUMsQ0FBQyxDQUFBO29CQUVKLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLENBQUM7eUJBQzFDLElBQUksQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtvQkFFNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7eUJBQ25CLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO3dCQUNqQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7b0JBQ3BCLENBQUMsQ0FBQyxDQUFBO2lCQUNMO2FBQ0Y7WUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtnQkFDekIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDekQsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN4QzthQUNGO1lBR0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7Z0JBQ3pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtvQkFDL0IsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN4QzthQUNGO1lBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ2xCLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUVqQixJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ3hCLE9BQU07YUFDUDtZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBR3BDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7WUFJM0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7YUFDL0I7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFVTyxVQUFVLENBQUMsSUFBdUIsRUFBRSxXQUEwQjtRQUNwRSxXQUFXLEdBQUcsV0FBVyxJQUFJLENBQUMsQ0FBQTtRQUM5QixNQUFNLEdBQUcsR0FBRywyQ0FBMkMsV0FBVyxTQUFTLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQTtRQUN0SCxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFLTyxXQUFXO1FBQ2pCLE1BQU0sS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBR3JDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNqQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7WUFHbkMsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUM3QixPQUFNO2FBQ1A7WUFHRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzFDLE9BQU07YUFDUDtZQUdELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxHQUFHLEVBQVksQ0FBQTtZQUNqRSxJQUFJO2dCQUVGLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7WUFBQyxPQUFNLENBQUMsRUFBRTtnQkFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xCO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRU0sZ0JBQWdCO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsTUFBTSxDQUFBO1FBQzdELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixPQUFPLEtBQUssT0FBTyxZQUFZLENBQUE7UUFDbEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxTQUFTO1FBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTSxVQUFVO1FBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVNLFVBQVU7UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFdBQVc7SUFtQ2YsWUFDRSxVQUE2QixFQUM3QixlQUF5QyxTQUFTLEVBQ2xELGFBQXFDLFNBQVMsRUFDOUMsZ0JBQTJDLFNBQVMsRUFDcEQsY0FBdUMsU0FBUyxFQUNoRCxjQUF1QyxTQUFTO1FBRWhELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxJQUFJLElBQUksWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLElBQUksSUFBSSxVQUFVLENBQzVDLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFnQixFQUNyRCxJQUFJLENBQUMsWUFBWSxDQUNsQixDQUFBO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLElBQUksSUFBSSxhQUFhLENBQ3JELFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQWdCLEVBQ3hELElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FDaEIsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxJQUFJLElBQUksV0FBVyxDQUMvQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBZ0IsRUFDdEQsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxDQUNoQixDQUFBO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLElBQUksSUFBSSxXQUFXLENBQy9DLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFnQixFQUN0RCxJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FDakIsQ0FBQTtJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsUUFBUTtRQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFO1lBQzFCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQ3JDLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsQ0FDM0MsQ0FBQTtTQUNGO1FBRUQsT0FBTyxXQUFXLENBQUMsU0FBd0IsQ0FBQTtJQUM3QyxDQUFDO0lBRU0sVUFBVTtRQUNmLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0NBRUY7QUFLRCxDQUFDLENBQUMsR0FBRyxFQUFFO0lBQ0wsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ25CLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtBQUNyQyxDQUFDLENBQUMsQ0FBQSJ9