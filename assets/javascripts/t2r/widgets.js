import * as datetime from "./datetime.js";
import { RedmineAPIService } from "./services.js";
const redmineService = new RedmineAPIService(T2R_REDMINE_API_KEY);
export const Widget = {};
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
Widget.initialize = function (el = document.body) {
    $(el).find('[data-t2r-widget]')
        .each(function () {
        const widgetList = this.getAttribute('data-t2r-widget');
        if (!widgetList)
            return;
        for (const widget of widgetList.split(' ')) {
            const flag = 'Widget' + widget + 'Ready';
            if (this.dataset[flag] == 'true') {
                continue;
            }
            const method = 'init' + widget;
            if ('undefined' !== typeof Widget[method]) {
                Widget[method](this);
                this.dataset[flag] = 'true';
                this.classList.add(`t2r-widget-${widget}`);
            }
            else {
                throw `To initialize "${widget}", please define "widgets.${method}"`;
            }
        }
    });
};
Widget.initTooltip = function (el) {
    $(el).tooltip();
};
Widget.initTogglRow = function (el) {
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
};
Widget.initDurationInput = function (el) {
    var $el = $(el);
    $el
        .on('input', function () {
        const val = $el.val();
        try {
            new datetime.Duration(val);
            el.setCustomValidity('');
        }
        catch (e) {
            el.setCustomValidity(e);
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
};
Widget.initRedmineActivityDropdown = function (el) {
    const $el = $(el);
    redmineService.getTimeEntryActivities((activities) => {
        if (activities === null)
            return;
        const $select = buildDropdownFromRecords({
            placeholder: $el.data('placeholder'),
            records: activities
        });
        $el.append($select.find('option'));
        const value = $el.data('selected');
        if ('undefined' !== typeof value) {
            $el.val(value).data('selected', null);
        }
    });
};
Widget.initTogglWorkspaceDropdown = function (el) {
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
};
Widget.initDurationRoundingDirection = function (el) {
    const $el = $(el);
    const options = {};
    options[datetime.RoundingMethod.Regular] = 'Round off';
    options[datetime.RoundingMethod.Up] = 'Round up';
    options[datetime.RoundingMethod.Down] = 'Round down';
    const $select = buildDropdownFromDictionary({
        placeholder: 'Don\'t round',
        options: options
    });
    $el.append($select.find('option'));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxLQUFLLFFBQVEsTUFBTSxlQUFlLENBQUE7QUFDekMsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBS2hELE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQWNqRSxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQTRCLEVBQUUsQ0FBQTtBQUVqRCxTQUFTLDJCQUEyQixDQUFDLElBSXBDO0lBQ0MsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFBO0lBQzVDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFBO0lBRTFDLElBQUksV0FBVyxFQUFFO1FBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsV0FBVyxXQUFXLENBQUMsQ0FBQTtLQUN2RDtJQUVELElBQUksVUFBVSxFQUFFO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtLQUNyQjtJQUVELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEtBQUssS0FBSyxLQUFLLFdBQVcsQ0FBQyxDQUFBO0tBQ3pEO0lBRUQsT0FBTyxHQUFHLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxJQUlqQztJQUNDLE1BQU0sT0FBTyxHQUFHLEVBQThCLENBQUE7SUFDOUMsS0FBSyxN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