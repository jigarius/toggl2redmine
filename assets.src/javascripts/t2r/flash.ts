enum Type {
  Notice = 'notice',
  Error = 'error',
  Warning = 'warning'
}

/**
 * Displays a rails-style flash message.
 */
function message(text: string, type: Type = Type.Notice): void {
  $('#content').prepend(`<div class="flash t2r ${type}">${text.trim()}</div>`);
}

export function error(text: string): void {
  message(text, Type.Error)
}

export function warning(text: string): void {
  message(text, Type.Warning)
}

export function notice(text: string): void {
  message(text, Type.Notice)
}

/**
 * Clears all flash messages.
 */
export function clear(): void {
  $('.t2r.flash').remove();
}
