enum Type {
  Notice = 'notice',
  Error = 'error',
  Warning = 'warning'
}

/**
 * Displays a rails-style flash message.
 */
function message(text: string, type: Type = Type.Notice) {
  $('#content').prepend(`<div class="flash t2r ${type}">${text.trim()}</div>`);
}

export function error(text: string) {
  message(text, Type.Error)
}

export function warning(text: string) {
  message(text, Type.Warning)
}

export function notice(text: string) {
  message(text, Type.Notice)
}

/**
 * Clears all flash messages.
 */
export function clear() {
  $('.t2r.flash').remove();
}
