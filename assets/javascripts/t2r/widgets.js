import * as datetime from "./datetime.js";
import { RedmineAPIService } from "./services.js";
const redmineService = new RedmineAPIService(T2R_REDMINE_API_KEY);
function buildDropdownFromDictionary(data) {
    const $el = $('<select />');
    const placeholder = data.placeholder || null;
    const attributes = data.attributes || null;
    if (placeholder) {
        $el.append(`<option value="">${placeholder}</option>`);
    }
    if (attributes) {
        $el.attr(attributes);
    }
    for (const value in data.options) {
        const label = data.options[value];
        $el.append(`<option value="${value}">${label}</option>`);
    }
    return $el;
}
function buildDropdownFromRecords(data) {
    const options = {};
    for (const record of data.records) {
        options[record.id.toString()] = record.name;
    }
    return buildDropdownFromDictionary({
        options: options,
        attributes: data.attributes,
        placeholder: data.placeholder
    });
}
export function initialize(el = document.body) {
    $(el).find('[data-t2r-widget]')
        .each(function () {
        const widgetList = this.getAttribute('data-t2r-widget');
        if (!widgetList)
            return;
        for (const widget of widgetList.split(' ')) {
            const flag = `Widget${widget}Ready`;
            if (this.dataset[flag] == 'true') {
                continue;
            }
            let initializer;
            switch (widget) {
                case 'Tooltip':
                    initializer = initTooltip;
                    break;
                case 'TogglRow':
                    initializer = initTogglRow;
                    break;
                case 'DurationInput':
                    initializer = initDurationInput;
                    break;
                case 'DurationRoundingMethodDropdown':
                    initializer = initDurationRoundingMethodDropdown;
                    break;
                case 'RedmineActivityDropdown':
                    initializer = initRedmineActivityDropdown;
                    break;
                case 'TogglWorkspaceDropdown':
                    initializer = initTogglWorkspaceDropdown;
                    break;
                default:
                    throw `Unrecognized widget: ${widget}`;
            }
            this.dataset[flag] = 'true';
            this.classList.add(`t2r-widget-${widget}`);
            initializer(this);
        }
    });
}
function initTooltip(el) {
    $(el).tooltip();
}
function initTogglRow(el) {
    const $el = $(el);
    $el.find('.cb-import')
        .on('change', function () {
        const $checkbox = $(this);
        const $tr = $checkbox.closest('tr');
        if ($checkbox.is(':checked')) {
            $tr.find(':input')
                .not('.cb-import')
                .removeAttr('disabled')
                .attr('required', 'required');
        }
        else {
            $tr.find(':input')
                .not('.cb-import')
                .removeAttr('required')
                .attr('disabled', 'disabled');
        }
    })
        .trigger('change');
    $el.find(':input').tooltip();
}
function initDurationInput(el) {
    const input = el;
    const $el = $(el);
    $el
        .on('input', function () {
        const val = $el.val();
        try {
            new datetime.Duration(val);
            input.setCustomValidity('');
        }
        catch (e) {
            if (e instanceof Error) {
                input.setCustomValidity(e.toString());
            }
            else {
                throw e;
            }
        }
    })
        .on('keyup', function (e) {
        const $input = $(this);
        const dur = new datetime.Duration();
        try {
            dur.setHHMM($input.val());
        }
        catch (e) {
            return;
        }
        const mm = dur.minutes % 60;
        const step = e.shiftKey ? 15 : 5;
        let delta = 0;
        if (e.key === 'ArrowUp') {
            delta = step - (mm % step);
            dur.add(new datetime.Duration(delta * 60));
        }
        else if (e.key === 'ArrowDown') {
            delta = (mm % step) || step;
            dur.sub(new datetime.Duration(delta * 60));
        }
        else {
            return;
        }
        $(this).val(dur.asHHMM()).trigger('input').trigger('select');
    })
        .on('change', function () {
        const $input = $(this);
        const value = $input.val();
        const dur = new datetime.Duration();
        try {
            dur.setHHMM(value);
        }
        catch (e) {
            console.debug(`Could not understand time: ${value}`);
        }
        $input.val(dur.asHHMM());
    });
}
function initDurationRoundingMethodDropdown(el) {
    const $el = $(el);
    const options = {};
    options[datetime.DurationRoundingMethod.Regular] = 'Round off';
    options[datetime.DurationRoundingMethod.Up] = 'Round up';
    options[datetime.DurationRoundingMethod.Down] = 'Round down';
    const $select = buildDropdownFromDictionary({
        placeholder: 'Don\'t round',
        options: options
    });
    $el.append($select.find('option'));
}
function initRedmineActivityDropdown(el) {
    const $el = $(el);
    redmineService.getTimeEntryActivities((activities) => {
        if (activities === null)
            return;
        const $select = buildDropdownFromRecords({
            placeholder: $el.data('placeholder'),
            records: activities
        });
        $el.append($select.find('option')).val('');
        const value = $el.data('selected') || '';
        $el.val(value).removeAttr('selected');
    });
}
function initTogglWorkspaceDropdown(el) {
    const $el = $(el);
    redmineService.getTogglWorkspaces((workspaces) => {
        if (workspaces === null)
            return;
        const $select = buildDropdownFromRecords({
            placeholder: $el.data('placeholder'),
            records: workspaces
        });
        $el.append($select.find('option'));
        const value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxLQUFLLFFBQVEsTUFBTSxlQUFlLENBQUE7QUFDekMsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBS2hELE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQVdqRSxTQUFTLDJCQUEyQixDQUFDLElBSXBDO0lBQ0MsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFBO0lBQzVDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFBO0lBRTFDLElBQUksV0FBVyxFQUFFO1FBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsV0FBVyxXQUFXLENBQUMsQ0FBQTtLQUN2RDtJQUVELElBQUksVUFBVSxFQUFFO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtLQUNyQjtJQUVELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEtBQUssS0FBSyxLQUFLLFdBQVcsQ0FBQyxDQUFBO0tBQ3pEO0lBRUQsT0FBTyxHQUFHLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxJQUlqQztJQUNDLE1BQU0sT0FBTyxHQUFHLEVBQThCLENBQUE7SUFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ2pDLE9B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