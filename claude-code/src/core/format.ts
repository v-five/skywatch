import type { LineCost, Speed } from '../../types'
import { capitalize, plural, shorten } from './text'

export const SECOND_MS = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY
const MINUTE_MS = SECONDS_PER_MINUTE * SECOND_MS
const HOUR_MS = MINUTES_PER_HOUR * MINUTE_MS
const DAY_MS = HOURS_PER_DAY * HOUR_MS
const MODEL_FALLBACK_MAX = 22
const BYTES_PER_KB = 1024
const BYTE_UNITS = ['KB', 'MB', 'GB', 'TB']
/** Sizes below this many units keep one decimal. */
const DECIMAL_BELOW = 10
/** Costs from this many dollars drop the cents. */
const WHOLE_DOLLARS_FROM = 100
const THOUSAND = 1000
const MILLION = 1_000_000

const pad2 = (value: number) => String(value).padStart(2, '0')

export function kTokens(count: number): string {
  if (count >= MILLION) return `${(count / MILLION).toFixed(1)}M`
  return count >= THOUSAND ? `${Math.round(count / THOUSAND)}k` : String(count)
}

export function fmtDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / SECOND_MS))
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  return minutes < MINUTES_PER_HOUR
    ? `${minutes}m${pad2(seconds % SECONDS_PER_MINUTE)}s`
    : `${Math.floor(minutes / MINUTES_PER_HOUR)}h${pad2(minutes % MINUTES_PER_HOUR)}m`
}

/** A running clock: m:ss, or XhYY past an hour. */
export function fmtTimer(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / SECOND_MS))
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  return minutes < MINUTES_PER_HOUR
    ? `${minutes}:${pad2(seconds % SECONDS_PER_MINUTE)}`
    : `${Math.floor(minutes / MINUTES_PER_HOUR)}h${pad2(minutes % MINUTES_PER_HOUR)}`
}

export function fmtClock(ms: number): string {
  return ms > 0 ? new Date(ms).toTimeString().slice(0, 8) : '--:--:--'
}

export function fmtUsd(usd: number): string {
  return usd >= WHOLE_DOLLARS_FROM ? `$${Math.round(usd)}` : `$${usd.toFixed(2)}`
}

export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < BYTES_PER_KB) return `${bytes || 0} B`
  let size = bytes
  let unit = -1
  while (size >= BYTES_PER_KB && unit < BYTE_UNITS.length - 1) {
    size /= BYTES_PER_KB
    unit += 1
  }
  return `${size.toFixed(size < DECIMAL_BELOW ? 1 : 0)} ${BYTE_UNITS[unit]}`
}

/** Time left until a window resets, its two largest units; empty when unknown or past. */
export function fmtResetIn(resetsAt: number | null | undefined, now: number): string {
  if (resetsAt === null || resetsAt === undefined || resetsAt <= now) return ''
  const minutes = Math.max(1, Math.floor((resetsAt - now) / MINUTE_MS))
  const days = Math.floor(minutes / MINUTES_PER_DAY)
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  if (days > 0) return `${days}d${hours}h`
  return hours > 0 ? `${hours}h${pad2(minutes % MINUTES_PER_HOUR)}m` : `${minutes}m`
}

export function fmtAgo(ms: number): string {
  if (ms < HOUR_MS) return `${Math.max(1, Math.round(ms / MINUTE_MS))}m ago`
  if (ms < DAY_MS) return `${Math.round(ms / HOUR_MS)}h ago`
  return `${plural(Math.round(ms / DAY_MS), 'day')} ago`
}

export function fmtSpeed(speed: Speed): string {
  return `${(speed.ttftMs / SECOND_MS).toFixed(1)}s${speed.tokPerS !== null ? ` · ${Math.round(speed.tokPerS)} tok/s` : ''}`
}

/** `five_hour` reads `5h`, `seven_day_opus` reads `7d opus`. */
export function limitLabel(kind: string): string {
  return kind
    .replace(/five[_ -]?hours?/i, '5h')
    .replace(/seven[_ -]?days?/i, '7d')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export function lineCost(cost: LineCost): string {
  return [`↑${kTokens(cost.tokIn)}`, `↓${kTokens(cost.tokOut)}`, cost.usd !== null ? fmtUsd(cost.usd) : null].filter(Boolean).join(' ')
}

/** A model id as people say it: `claude-opus-5-5[1m]` reads `Opus 5.5 1M`, `claude-3-5-haiku-20241022` reads `Haiku 3.5`. */
export function prettyModel(id: string): string {
  if (!id) return '—'
  const big = /\[1m\]|-1m\b/i.test(id) ? ' 1M' : ''
  const current = /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(?![\d])/i.exec(id)
  if (current?.[1] && !/^\d/.test(current[1])) {
    return `${capitalize(current[1].toLowerCase())} ${current[2]}${current[3] ? `.${current[3]}` : ''}${big}`
  }
  const legacy = /claude-(\d+)(?:-(\d))?-([a-z]+)/i.exec(id)
  if (legacy?.[3]) return `${capitalize(legacy[3].toLowerCase())} ${legacy[1]}${legacy[2] ? `.${legacy[2]}` : ''}${big}`
  return shorten(id, MODEL_FALLBACK_MAX) || '—'
}
