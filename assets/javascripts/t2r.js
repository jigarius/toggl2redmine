import { LocalStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineAPIService } from "./t2r/services.js";
import * as widget from "./t2r/widgets.js";
import * as renderers from "./t2r/renderers.js";
import * as datetime from "./t2r/datetime.js";
import * as utils from "./t2r/utils.js";
import * as flash from "./t2r/flash.js";
class PublishForm {
    constructor(element, filterForm) {
        const that = this;
        this.element = $(element);
        this.filterForm = filterForm;
        this.element.on('submit', () => {
            that.onSubmit();
            return false;
        });
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
        const filterFormValues = this.filterForm.getValues();
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
        console.info('Filter form submitted', values);
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
    constructor(element, filterForm) {
        this.element = $(element);
        this.filterForm = filterForm;
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
        const url = T2R_REDMINE_REPORT_URL_FORMAT.replace('[@date]', date.toHTMLDate());
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
        const oDate = datetime.DateTime.fromString(sDate);
        const workspaceId = Application.instance().localStorage.get('toggl-workspace');
        this.updateLink(oDate, workspaceId);
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
        workspaceId = workspaceId || 0;
        const url = T2R_TOGGL_REPORT_URL_FORMAT
            .replace(/\[@date\]/g, date.toHTMLDate())
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
    constructor(redmineService, redmineReport = undefined, togglReport = undefined, publishForm = undefined, filterForm = undefined, localStorage = undefined) {
        this.localStorage = localStorage || new LocalStorage('toggl2redmine.');
        this.redmineService = redmineService;
        this.filterForm = filterForm || FilterForm.instance();
        this.togglReport = togglReport || new TogglReport(document.getElementById('toggl-report'), this.filterForm);
        this.redmineReport = redmineReport || new RedmineReport(document.getElementById('redmine-report'), this.filterForm);
        this.publishForm = publishForm || new PublishForm(document.getElementById('publish-form'), this.filterForm);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBQzVDLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLG1CQUFtQixDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sa0JBQWtCLENBQUE7QUFFMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvQyxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFBO0FBQzdDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFJZixZQUFtQixPQUFvQixFQUFFLFVBQXNCO1FBQzdELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUU1QixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQzdCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNmLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU0sUUFBUTtRQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsK0RBQStELENBQUMsRUFBRTtZQUM3RSxPQUFNO1NBQ1A7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFHYixJQUFJLFdBQVcsQ0FBQyxRQUFRLEVB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