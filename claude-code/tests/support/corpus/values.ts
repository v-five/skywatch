export const MODEL_IDS: readonly string[] = [
  '',
  'claude-opus-5-5',
  'claude-opus-5-5[1m]',
  'claude-sonnet-4-5-20250929',
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-fable-5-1',
  'gpt-4o-mini-2024-07-18-extra-long',
  'claude-haiku-4',
]

export const NUMBERS: readonly number[] = [0, 1, 999, 1000, 1499, 1500, 12_345, 999_999, 1_000_000, 2_340_000, -5]

export const DURATIONS: readonly number[] = [
  -1000, 0, 499, 500, 59_400, 59_600, 60_000, 61_000, 3_599_000, 3_600_000, 3_661_000, 90_061_000,
]

export const USD: readonly number[] = [0, 0.004, 0.5, 1.234, 99.99, 100, 123.6]

export const RESETS: readonly { resetsAt: number | null | undefined; now: number }[] = [
  { resetsAt: null, now: 0 },
  { resetsAt: undefined, now: 0 },
  { resetsAt: 1000, now: 2000 },
  { resetsAt: 30_000, now: 0 },
  { resetsAt: 25 * 60_000, now: 0 },
  { resetsAt: 3 * 3_600_000 + 10 * 60_000, now: 0 },
  { resetsAt: 4 * 86_400_000 + 2 * 3_600_000, now: 0 },
]

export const LIMIT_KINDS: readonly string[] = ['five_hour', 'seven_day', 'seven_day_opus', 'five-hours', 'monthly_spend']

export const SHORTEN_CASES: readonly [string, number][] = [
  ['hello world', 20],
  ['hello world', 5],
  ['  many   spaces\nhere  ', 30],
  ['abc', 0],
  ['abc', 1],
  ['abcd   efgh', 6],
]

export const PERCENTS: readonly number[] = [-5, 0, 9.9, 10, 24, 25, 39, 40, 55, 69.9, 70, 79, 80, 89, 90, 100, 130]
