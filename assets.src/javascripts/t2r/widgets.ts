import * as models from "./models.js"
import * as datetime from "./datetime.js"
import {RedmineAPIService} from "./services.js";

declare const T2R_REDMINE_API_KEY: string;

// Redmine service.
const redmineService = new RedmineAPIService(T2R_REDMINE_API_KEY)

interface DropdownOption {
  id: number | string,
  name: string
}

interface DropdownOptionDictionary {
  [index:string]: string
}

function buildDropdownFromDictionary(data: {
  options: DropdownOptionDictionary,
  attributes?: { [index:string]: string }
  placeholder?: string
}): JQuery<HTMLElement> {
  const $el = $('<select />')
  const placeholder = data.placeholder || null
  const attributes = data.attributes || null

  if (placeholder) {
    $el.append(`<option value="">${placeholder}</option>`)
  }

  if (attributes) {
    $el.attr(attributes)
  }

  for (const value in data.options) {
    const label = data.options[value]
    $el.append(`<option value="${value}">${label}</option>`)
  }

  return $el
}

function buildDropdownFromRecords(data: {
  records: DropdownOption[],
  attributes?: { [index:string]: string },
  placeholder?: string
}) {
  const options = {} as DropdownOptionDictionary
  for (const record of data.records) {
    options[record.id.toString()] = record.name
  }

  return buildDropdownFromDictionary({
    options: options,
    attributes: data.attributes,
    placeholder: data.placeholder
  })
}

interface WidgetInitCallback {
  (el: HTMLElement | HTMLInputElement): void
}

/**
 * Initializes all widgets in the given element.
 *
 * @param {HTMLElement} el
 */
export function initialize(el = document.body): void {
  $(el).find('[data-t2r-widget]')
    .each(function () {
      const widgetList = this.getAttribute('data-t2r-widget')
      if (!widgetList) return

      for (const widget of widgetList.split(' ')) {
        // Initialize one widget only once per element.
        const flag = `Widget${widget}Ready`
        if (this.dataset[flag] == 'true') {
          continue
        }


        let initializer: WidgetInitCallback
        switch (widget) {
          case 'Tooltip':
            initializer = initTooltip
            break

          case 'TogglRow':
            initializer = initTogglRow
            break

          case 'DurationInput':
            initializer = initDurationInput
            break

          case 'DurationRoundingMethodDropdown':
            initializer = initDurationRoundingMethodDropdown
            break

          case 'RedmineActivityDropdown':
            initializer = initRedmineActivityDropdown
            break

          case 'TogglWorkspaceDropdown':
            initializer = initTogglWorkspaceDropdown
            break

          default:
            throw `Unrecognized widget: ${widget}`
        }

        this.dataset[flag] = 'true'
        this.classList.add(`t2r-widget-${widget}`)
        initializer(this)
      }
    });
}

function initTooltip(el: HTMLElement): void {
  $(el).tooltip();
}

function initTogglRow(el: HTMLElement): void {
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

function initDurationInput(el: HTMLElement): void {
  const input = el as HTMLInputElement
  const $el = $(el);

  $el
    .on('input', function() {
      const val = $el.val() as string
      try {
        // If a duration object could be created, then the the time is valid.
        new datetime.Duration(val)
        input.setCustomValidity('')
      } catch (e) {
        input.setCustomValidity(e)
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

function initDurationRoundingMethodDropdown(el: HTMLElement): void {
  const $el = $(el);

  // Prepare rounding options.
  const options: DropdownOptionDictionary = {}
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

function initRedmineActivityDropdown(el: HTMLElement): void {
  const $el = $(el)
  redmineService.getTimeEntryActivities((activities: DropdownOption[] | null) => {
    if (activities === null) return

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

function initTogglWorkspaceDropdown(el: HTMLElement): void {
  const $el = $(el);
  redmineService.getTogglWorkspaces((workspaces: models.TogglWorkspace[] | null) => {
    if (workspaces === null) return

    // Generate a SELECT element and use its options.
    const $select = buildDropdownFromRecords({
      placeholder: $el.data('placeholder') as string,
      records: workspaces as DropdownOption[]
    })

    $el.append($select.find('option'))

    const value = $el.data('selected')
    if ('undefined' !== typeof value) {
      $el.val(value).data('selected', null)
    }
  });
}
