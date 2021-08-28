import * as datetime from "./datetime.js"
import {RedmineAPIService} from "./services.js";

declare const T2R_REDMINE_API_KEY: string;

// Redmine service.
const redmineService = new RedmineAPIService(T2R_REDMINE_API_KEY)

/**
 * Toggl 2 Redmine widget manager.
 */
export const Widget: any = {}

function buildDropdownFromDictionary(data: any) {
  const $el = $('<select />')
  const placeholder = data.placeholder || null
  const attributes = data.attributes || null

  if (placeholder) {
    $el.append(`<option value="">${placeholder}</option>`)
  }

  if (attributes) {
    $el.attr(data.attributes)
  }

  for (const value in data.options) {
    const label = data.options[value]
    $el.append(`<option value="${value}">${label}</option>`)
  }

  return $el
}

function buildDropdownFromRecords(data: any) {
  data.options = {}
  for (const record of data.records) {
    data.options[record.id] = record.name
  }

  delete data['records']
  return buildDropdownFromDictionary(data)
}

/**
 * Initializes all widgets in the given element.
 *
 * @param {Object} el
 */
Widget.initialize = function (el = document.body) {
  $(el).find('[data-t2r-widget]')
    .each(function () {
      const widgetList = this.getAttribute('data-t2r-widget')
      if (!widgetList) return

      for (const widget of widgetList.split(' ')) {
        // Initialize the widget, if required.
        const flag = 'Widget' + widget + 'Ready'
        if (this.dataset[flag] == 'true') {
          continue
        }

        const method = 'init' + widget;
        if ('undefined' !== typeof Widget[method]) {
          Widget[method](this);
          this.dataset[flag] = 'true'
          this.classList.add(`t2r-widget-${widget}`)
        }
        else {
          throw `To initialize "${widget}", please define "widgets.${method}"`
        }
      }
    });
}

Widget.initTooltip = function(el: any) {
  $(el).tooltip();
}

Widget.initTogglRow = function(el: any) {
  const $el = $(el);

  // If checkbox changes, update totals.
  $el.find('.cb-import')
    .on('change', function () {
      const $checkbox = $(this);
      const $tr = $checkbox.closest('tr');

      // If the row is marked for import, make fields required.
      if ($checkbox.is(':checked')) {
        $tr.find(':input')
          .not('.cb-import')
          .removeAttr('disabled')
          .attr('required', 'required');
      }
      // Otherwise, the fields are disabled.
      else {
        $tr.find(':input')
          .not('.cb-import')
          .removeAttr('required')
          .attr('disabled', 'disabled')
      }
    })
    .trigger('change')

  $el.find(':input').tooltip()
}

Widget.initDurationInput = function (el: any) {
  var $el = $(el);
  $el
    .on('input', function() {
      const val = $el.val() as string
      try {
        // If a duration object could be created, then the the time is valid.
        new datetime.Duration(val)
        el.setCustomValidity('')
      } catch (e) {
        el.setCustomValidity(e)
      }
    })
    // Update totals as the user updates hours.
    .on('keyup', function (e) {
      const $input = $(this)
      const dur = new datetime.Duration()

      // Detect current duration.
      try {
        dur.setHHMM(($input.val() as string));
      } catch(e) {
        return;
      }

      // Round to the nearest 5 minutes or 15 minutes.
      const mm = dur.minutes % 60
      const step = e.shiftKey ? 15 : 5
      let delta = 0

      // On "Up" press.
      if (e.key === 'ArrowUp') {
        delta = step - (mm % step);
        dur.add(new datetime.Duration(delta * 60));
      }
      // On "Down" press.
      else if (e.key === 'ArrowDown') {
        delta = (mm % step) || step;
        dur.sub(new datetime.Duration(delta * 60));
      }
      // Do nothing.
      else {
        return
      }

      // Update value in the input field.
      $(this).val(dur.asHHMM()).trigger('input').trigger('select');
    })
    .on('change', function () {
      const $input = $(this)
      const value = $input.val()
      const dur = new datetime.Duration()

      // Determine the visible value.
      try {
        dur.setHHMM(value as string)
      } catch(e) {
        console.debug(`Could not understand time: ${value}`)
      }

      // Update the visible value and the totals.
      $input.val(dur.asHHMM())
    });
}

Widget.initRedmineActivityDropdown = function (el: any) {
  const $el = $(el)
  redmineService.getTimeEntryActivities((activities: any[] | null) => {
    // Generate a SELECT element and use it's options.
    const $select = buildDropdownFromRecords({
      placeholder: $el.data('placeholder'),
      records: activities
    });

    $el.append($select.find('option'));

    // Mark selection.
    const value = $el.data('selected');
    if ('undefined' !== typeof value) {
      $el.val(value).data('selected', null);
    }
  })
}

Widget.initTogglWorkspaceDropdown = function (el: any) {
  const $el = $(el);
  redmineService.getTogglWorkspaces((workspaces: any) => {
    // Generate a SELECT element and use its options.
    const $select = buildDropdownFromRecords({
      placeholder: $el.data('placeholder'),
      records: workspaces
    })

    $el.append($select.find('option'))

    const value = $el.data('selected')
    if ('undefined' !== typeof value) {
      $el.val(value).data('selected', null)
    }
  });
}

Widget.initDurationRoundingDirection = function (el: any) {
  const $el = $(el);

  // Prepare rounding options.
  const options: any = {}
  options[datetime.RoundingMethod.Regular] = 'Round off'
  options[datetime.RoundingMethod.Up] = 'Round up'
  options[datetime.RoundingMethod.Down] = 'Round down'

  // Generate a SELECT element and use it's options.
  const $select = buildDropdownFromDictionary({
    placeholder: 'Don\'t round',
    options: options
  });

  $el.append($select.find('option'));
}
