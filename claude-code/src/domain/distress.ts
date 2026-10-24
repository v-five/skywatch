import type { Jump, Shields } from '../../types'
import { fmtDuration } from '../core'

/** Errors in a row on the bridge before it reads as stuck. */
const ERROR_STREAK_MIN = 3
/** Edits to one file in one jump before it reads as going back and forth. */
const SAME_FILE_EDITS_MIN = 6
/** How long a permission prompt waits before it reads as missed. */
const WAITING_MIN_MS = 2 * 60_000

/** Why the session looks stuck, in words; null while it does not. */
export function distressOf(data: { jump: Jump; shields: Shields; now: number }): string | null {
  const { jump, shields, now } = data
  if (jump.errorStreak >= ERROR_STREAK_MIN) return `${jump.errorStreak} errors in a row`
  const [file, edits] = Object.entries(jump.editsByFile ?? {}).sort((left, right) => right[1] - left[1])[0] ?? []
  if (file && edits !== undefined && edits >= SAME_FILE_EDITS_MIN) return `${file} edited ${edits} times this jump`
  const asked = shields.recent.filter(check => check.verdict === 'ask').map(check => check.at)
  const oldest = asked.length > 0 ? Math.min(...asked) : null
  if (oldest !== null && now - oldest >= WAITING_MIN_MS) return `a permission prompt has waited ${fmtDuration(now - oldest)}`
  return null
}
