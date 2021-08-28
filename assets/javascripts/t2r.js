import { LocalStorage, TemporaryStorage } from "./t2r/storage.js";
import { translate as t } from "./t2r/i18n.js";
import { RedmineService } from "./t2r/services.js";
import { Widget } from "./t2r/widgets.js";
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
            const elem = document.getElementById('publish-form');
            PublishForm._instance = new PublishForm(elem);
        }
        return PublishForm._instance;
    }
    onSubmit() {
        if (!confirm('This action cannot be undone. Do you really want to continue?')) {
            return;
        }
        this.disable();
        flash.clear();
        if (T2R.togglReport.element.find('tbody input.cb-import').filter(':checked').length === 0) {
            flash.error('Please select the entries which you want to import to Redmine.');
            this.enable();
            return;
        }
        console.info('Sending time entries to Redmine.');
        T2R.togglReport.element.find('tbody tr').each(function () {
            const $tr = $(this);
            if (!$tr.find('input.cb-import').prop('checked')) {
                return;
            }
            const timeEntry = {
                spent_on: T2R.tempStorage.get('date'),
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
            T2R.redmineService.postTimeEntry({
                time_entry: timeEntry,
                toggl_ids: $tr.data('t2r.entry').ids
            }, (errors) => {
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
        T2R.__publishWatcher = setInterval(() => {
            if (T2R.redmineService.requestQueue.length === 0) {
                clearInterval(T2R.__publishWatcher);
                T2R.publishForm.enable();
                T2R.redmineReport.update();
            }
        }, 250);
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
            const elem = document.getElementById('filter-form');
            FilterForm._instance = new FilterForm(elem);
        }
        return FilterForm._instance;
    }
    getDefaults() {
        return {
            date: utils.dateFormatYYYYMMDD(new Date()),
            'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
            'default-activity': T2R.localStorage.get('default-activity'),
            'rounding-value': T2R.localStorage.get('rounding-value'),
            'rounding-direction': T2R.localStorage.get('rounding-direction')
        };
    }
    getValues() {
        const $defaultActivity = $('select#default-activity');
        const defaultActivity = $defaultActivity.val() || $defaultActivity.data('selected');
        const $togglWorkspace = $('select#toggl-workspace');
        const togglWorkspace = $togglWorkspace.val() || $togglWorkspace.data('selected');
        let roundingValue = $('input#rounding-value').val();
        roundingValue = roundingValue ? parseInt(roundingValue) : 0;
        roundingValue = isNaN(roundingValue) ? 0 : roundingValue;
        const roundingMethod = $('select#rounding-direction').val();
        let sDate = $('#date').val();
        try {
            utils.dateStringToObject(sDate + ' 00:00:00');
        }
        catch (e) {
            sDate = null;
        }
        return {
            'default-activity': defaultActivity,
            'toggl-workspace': togglWorkspace,
            'rounding-direction': roundingMethod,
            'rounding-value': roundingValue,
            date: sDate
        };
    }
    setValues(values) {
        this.element
            .find(':input')
            .each(function () {
            const $field = $(this);
            const name = $field.attr('name');
            const value = values[name];
            if (typeof value === 'undefined')
                return;
            switch (name) {
                case 'default-activity':
                case 'toggl-workspace':
                    $field
                        .data('selected', value)
                        .val(value);
                    break;
                default:
                    if (typeof value !== 'undefined') {
                        $field.val(values[name]);
                    }
                    break;
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
        for (const name in defaults) {
            const value = values[name];
            if (typeof value === 'undefined' || '' === value || false === value) {
                values[name] = defaults[name];
            }
        }
        this.element.find(':input').val('');
        this.setValues(values);
        this.onSubmit();
    }
    onSubmit() {
        const values = this.getValues();
        if (!values['date']) {
            this.element.find('#date').trigger('focus');
            return false;
        }
        T2R.localStorage.set('default-activity', values['default-activity']);
        T2R.localStorage.set('toggl-workspace', values['toggl-workspace']);
        T2R.localStorage.set('rounding-value', values['rounding-value']);
        T2R.localStorage.set('rounding-direction', values['rounding-direction']);
        const sDate = T2R.tempStorage.set('date', values['date']);
        const oDate = utils.dateStringToObject(sDate);
        window.location.hash = sDate;
        $('h2 .date').html('(' + oDate.toLocaleDateString() + ')');
        console.info('Filter form updated: ', {
            'date': T2R.tempStorage.get('date'),
            'default-activity': T2R.localStorage.get('default-activity'),
            'toggl-workspace': T2R.localStorage.get('toggl-workspace'),
            'rounding-value': T2R.localStorage.get('rounding-value'),
            'rounding-direction': T2R.localStorage.get('rounding-direction')
        });
        setTimeout(() => {
            T2R.redmineReport.update();
            T2R.togglReport.update();
        }, 250);
        T2R.publishForm.enable();
        return false;
    }
}
class RedmineReport {
    constructor(element) {
        this.element = $(element);
    }
    static instance() {
        if (!RedmineReport._instance) {
            const elem = document.getElementById('redmine-report');
            RedmineReport._instance = new RedmineReport(elem);
        }
        return RedmineReport._instance;
    }
    update() {
        var that = this;
        this.showLoader();
        this.makeEmpty();
        const sDate = T2R.tempStorage.get('date');
        const oDate = datetime.DateTime.fromString(sDate);
        this.updateLink(sDate);
        this.updateLastImportDate();
        const query = { from: oDate, till: oDate };
        T2R.redmineService.getTimeEntries(query, (entries) => {
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
        T2R.redmineService.getLastImportDate((lastImportDate) => {
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
    constructor(element) {
        this.element = $(element);
        this.checkAll = this.element.find('input.check-all');
        this.init();
    }
    static instance() {
        if (!TogglReport._instance) {
            const elem = document.getElementById('toggl-report');
            TogglReport._instance = new TogglReport(elem);
        }
        return TogglReport._instance;
    }
    init() {
        var that = this;
        this.checkAll.tooltip()
            .on('change', () => {
            const checked = $(this).prop('checked');
            that.element.find('tbody input.cb-import:enabled')
                .prop('checked', checked)
                .trigger('change');
        });
    }
    update() {
        var that = this;
        T2R.publishForm.disable();
        this.showLoader();
        this.makeEmpty();
        const sDate = T2R.tempStorage.get('date');
        const workspaceId = T2R.localStorage.get('toggl-workspace');
        this.updateLink(sDate, workspaceId);
        this.checkAll
            .prop('checked', false)
            .attr('disabled', 'disabled');
        const query = {
            from: datetime.DateTime.fromString(sDate + ' 00:00:00'),
            till: datetime.DateTime.fromString(sDate + ' 23:59:59'),
            workspace: workspaceId
        };
        T2R.redmineService.getTogglTimeEntries(query, (entries) => {
            let pendingEntriesExist = false;
            const roundingValue = T2R.localStorage.get('rounding-value');
            const roundingMethod = T2R.localStorage.get('rounding-direction');
            for (const key in entries) {
                const entry = entries[key];
                entry.duration = new datetime.Duration(Math.max(0, entry.duration));
                entry.roundedDuration = new datetime.Duration(entry.duration.seconds);
                if (roundingMethod !== '' && roundingValue > 0) {
                    entry.roundedDuration.roundTo(roundingValue, roundingMethod);
                }
                else {
                    entry.roundedDuration.roundTo(1, datetime.RoundingMethod.Regular);
                }
                entries[key] = entry;
            }
            if (0 === entries.length) {
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
                        .on('input', T2R.updateTogglTotals)
                        .on('change', T2R.updateTogglTotals);
                    $tr.find('select[data-property=activity_id]')
                        .attr('data-selected', T2R.localStorage.get('default-activity'));
                    $tr.find('.cb-import')
                        .on('change', T2R.updateTogglTotals);
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
            Widget.initialize(that.element[0]);
            that.hideLoader();
            if (!pendingEntriesExist) {
                return;
            }
            that.checkAll.removeAttr('disabled');
            T2R.publishForm.enable();
            if (T2R.filterForm.element.has(':focus').length > 0) {
                that.checkAll.trigger('focus');
            }
        });
    }
    updateLink(date, workspaceId) {
        workspaceId = workspaceId || T2R.tempStorage.get('default_toggl_workspace', 0);
        const url = T2R_TOGGL_REPORT_URL_FORMAT
            .replace(/\[@date\]/g, date)
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
const T2R = {
    localStorage: new LocalStorage('t2r.'),
    tempStorage: new TemporaryStorage(),
    redmineService: new RedmineService(T2R_REDMINE_API_KEY),
    filterForm: null,
    publishForm: null,
    redmineReport: null,
    togglReport: null
};
$(() => {
    Widget.initialize();
    T2R.publishForm = PublishForm.instance();
    T2R.filterForm = FilterForm.instance();
    T2R.redmineReport = RedmineReport.instance();
    T2R.togglReport = TogglReport.instance();
    T2R.filterForm.reset({ date: utils.getDateFromLocationHash() });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidDJyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxTQUFTLElBQUksQ0FBQyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzdDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDeEMsT0FBTyxLQUFLLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRCxPQUFPLEtBQUssUUFBUSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxLQUFLLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQTtBQUt2QyxNQUFNLFdBQVc7SUFJZixZQUFvQixPQUFvQjtRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUM3QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFRO1FBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFO1lBQzFCLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFFLENBQUE7WUFDckQsV0FBVyxDQUFDLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUM5QztRQUVELE9BQU8sV0FB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