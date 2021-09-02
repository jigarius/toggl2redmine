import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineAPIService } from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
class PublishForm {
    constructor(element) {
        const that = this;
        this.element = $(element);
        this.element.on('submit', () => {
            that.onSubmit();
            return false;
        });
    }
    static instance() {
        if (!PublishForm._instance) {
            PublishForm._instance = new PublishForm(document.getElementById('publish-form'));
        }
        return PublishForm._instance;
    }
    onSubmit() {
        if (!confirm('This action cannot be undone. Do you really want to continue?')) {
            return;
        }
        this.disable();
        flash.clear();
        if (Application.instance().togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
            flash.error('Please select the entries which you want to import to Redmine.');
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
                spent_on: Application.instance().tempStorage.get('date'),
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
            Application.instance().redmineService.postTimeEntry({
                time_entry: timeEntry,
                toggl_ids: $tr.data('t2r.entry').ids
            }, (errors) => {
                if (Application.instance().redmineService.requestQueue.length === 0) {
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
    constructor(element) {
        this.element = $(element);
        this.init();
    }
    static instance() {
        if (!FilterForm._instance) {
            FilterForm._instance = new FilterForm(document.getElementById('filter-form'));
        }
        return FilterForm._instance;
    }
    getDefaults() {
        const values = {};
        values['date'] = (new datetime.DateTime).toHTMLDate();
        const workspaceId = Application.instance().localStorage.get('toggl-workspace');
        if (workspaceId) {
            values['toggl-workspace'] = parseInt(workspaceId);
        }
        const defaultActivityId = Application.instance().localStorage.get('default-activity');
        if (defaultActivityId) {
            values['default-activity'] = parseInt(defaultActivityId);
        }
        const roundingValue = Application.instance().localStorage.get('rounding-value') || '0';
        values['rounding-value'] = parseInt(roundingValue);
        const roundingDirection = Application.instance().localStorage.get('rounding-direction') || undefined;
        if (roundingDirection) {
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
        const localStorage = Application.instance().localStorage;
        const tempStorage = Application.instance().tempStorage;
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
        localStorage.set('default-activity', values['default-activity']);
        localStorage.set('toggl-workspace', values['toggl-workspace']);
        localStorage.set('rounding-value', values['rounding-value']);
        localStorage.set('rounding-direction', values['rounding-direction']);
        tempStorage.set('date', oDate.toHTMLDate());
        console.info('Filter form submitted', {
            'date': tempStorage.get('date'),
            'default-activity': localStorage.get('default-activity'),
            'toggl-workspace': localStorage.get('toggl-workspace'),
            'rounding-value': localStorage.get('rounding-value'),
            'rounding-direction': localStorage.get('rounding-direction')
        });
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
    constructor(element) {
        this.element = $(element);
    }
    static instance() {
        if (!RedmineReport._instance) {
            RedmineReport._instance = new RedmineReport(document.getElementById('redmine-report'));
        }
        return RedmineReport._instance;
    }
    update() {
        var that = this;
        this.showLoader();
        this.makeEmpty();
        const sDate = Application.instance().tempStorage.get('date');
        const oDate = datetime.DateTime.fromString(sDate);
        this.updateLink(sDate);
        this.updateLastImportDate();
        const query = { from: oDate, till: oDate };
        Application.instance().redmineService.getTimeEntries(query, (entries) => {
            if (entries === null) {
                flash.error('An error has occurred. Please try again after some time.');
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
        const url = T2R_REDMINE_REPORT_URL_FORMAT.replace('[@date]', date);
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
        Application.instance().redmineService.getLastImportDate((lastImportDate) => {
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
    constructor(element, filterForm) {
        this.element = $(element);
        this.checkAll = this.element.find('input.check-all');
        this.filterForm = filterForm;
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
        Application.instance().publishForm.disable();
        this.showLoader();
        this.makeEmpty();
        const sDate = this.filterForm.getValues()['date'];
        const workspaceId = Application.instance().localStorage.get('toggl-workspace');
        this.updateLink(sDate, workspaceId);
        this.checkAll
            .prop('checked', false)
            .attr('disabled', 'disabled');
        const query = {
            from: datetime.DateTime.fromString(sDate + ' 00:00:00'),
            till: datetime.DateTime.fromString(sDate + ' 23:59:59'),
            workspaceId: workspaceId
        };
        Application.instance().redmineService.getTogglTimeEntries(query, (entries) => {
            let pendingEntriesExist = false;
            const roundingValue = Application.instance().localStorage.get('rounding-value');
            const roundingMethod = Application.instance().localStorage.get('rounding-direction');
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
                        .attr('data-selected', Application.instance().localStorage.get('default-activity'));
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
        workspaceId = workspaceId || Application.instance().tempStorage.get('default_toggl_workspace', 0);
        const url = T2R_TOGGL_REPORT_URL_FORMAT
            .replace(/[@date]/g, date)
            .replace('[@workspace]', workspaceId.toString());
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
    constructor(redmineService, redmineReport = undefined, togglReport = undefined, publishForm = undefined, filterForm = undefined, localStorage = undefined, tempStorage = undefined) {
        this.localStorage = localStorage || new LocalStorage('toggl2redmine.');
        this.tempStorage = tempStorage || new TemporaryStorage();
        this.redmineService = redmineService;
        this.filterForm = filterForm || FilterForm.instance();
        this.togglReport = togglReport || new TogglReport(document.getElementById('toggl-report'), this.filterForm);
        this.redmineReport = redmineReport || RedmineReport.instance();
        this.publishForm = publishForm || PublishForm.instance();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3BELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUM7QUFFM0MsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRCxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFJZixZQUFvQixPQUFvQjtRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUM3QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFRO1FBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFO1lBQzFCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQ3JDLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFnQixDQUN2RCxDQUFBO1NBQ0Y7UUFFRCxPQUFPLFdBQVcsQ0FBQyxTQUF3QixDQUFBO0lBQzdDLENBQUM7SUFF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