export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/** `1 error`, `2 errors`; `many` for an irregular plural. */
export function plural(count: number, word: string, many = `${word}s`): string {
  return `${count} ${count === 1 ? word : many}`
}

/** A path's last part, with either slash. */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? ''
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching escape sequences is the point.
const ESCAPE_SEQUENCE = /\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g

/** Text a surface will draw: escape sequences and control characters removed, a tab as a space; newlines kept. */
export function printable(text: string): string {
  return text.replace(ESCAPE_SEQUENCE, '').replace(/\t/g, ' ').replace(CONTROL, '')
}

/** Printable, whitespace collapsed, then cut to `max` characters with an ellipsis, never through an emoji. */
export function shorten(text: string, max: number): string {
  const line = printable(text).replace(/\s+/g, ' ').trim()
  if (max <= 0) return ''
  const chars = Array.from(line)
  return chars.length > max
    ? `${chars
        .slice(0, Math.max(0, max - 1))
        .join('')
        .trimEnd()}…`
    : line
}
