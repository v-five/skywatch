/** The session's folder and the person's home: paths under them read relative. */
export type Places = { readonly cwd: string; readonly home: string }

export const NO_PLACES: Places = { cwd: '', home: '' }

const TAIL_PARTS = 2

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Paths in `text` under the session's folder lose that folder (the folder itself reads `.`); paths under home start with `~`. */
export function relativePaths(text: string, places: Places): string {
  const inFolder = places.cwd
    ? text
        .split(`${places.cwd}/`)
        .join('')
        .replace(new RegExp(`${escapeRegExp(places.cwd)}(?![\\w./-])`, 'g'), '.')
    : text
  return places.home ? inFolder.split(`${places.home}/`).join('~/') : inFolder
}

/** A file's path as a line shows it: relative where it can be, else its last two parts. */
export function shortPath(path: string, places: Places): string {
  const relative = relativePaths(path, places)
  return relative !== path ? relative : path.split(/[\\/]/).slice(-TAIL_PARTS).join('/')
}
