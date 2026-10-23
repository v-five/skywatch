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

/** Whitespace collapsed, then cut to `max` characters with an ellipsis. */
export function shorten(text: string, max: number): string {
  const line = text.replace(/\s+/g, ' ').trim()
  if (max <= 0) return ''
  return line.length > max ? `${line.slice(0, Math.max(0, max - 1)).trimEnd()}…` : line
}
