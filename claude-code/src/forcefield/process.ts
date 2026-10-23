/** The name bash gives `$0` in the scripts the force field runs. */
export const SCRIPT_NAME = 'skywatch'

export const MEASURE_TIMEOUT_MS = 15_000
export const REF_TIMEOUT_MS = 10_000
export const LOOKUP_TIMEOUT_MS = 5_000

/** How much of a failed command's error output a measure shows. */
export const ERROR_MAX = 200

export function nonEmptyLines(text: string): string[] {
  return text.split('\n').filter(line => line !== '')
}
