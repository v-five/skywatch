/** The commands SkyWatch knows how to spot and measure, in bundles one directive switches at once. */
export const RISK_GROUPS = ['delete', 'secrets', 'git-history', 'publish', 'infra', 'database'] as const
export type RiskGroup = (typeof RISK_GROUPS)[number]

/** Where an earlier `cd` moved: null is the session folder, '-' is unknown (`cd -`). */
export type Dir = string | null

type CommandGroup = Exclude<RiskGroup, 'secrets'>
type HistoryRewrite<K extends string> = { kind: K; group: 'git-history'; label: string; args: string[]; dir: Dir }

export type Risk =
  | { kind: 'rm'; group: 'delete'; label: string; targets: string[]; dir: Dir }
  | { kind: 'find-delete'; group: 'delete'; label: string; args: string[]; dir: Dir }
  | { kind: 'git-clean'; group: 'delete'; label: string; args: string[]; dir: Dir }
  | HistoryRewrite<'git-reset'>
  | HistoryRewrite<'git-checkout'>
  | HistoryRewrite<'git-push-force'>
  | { kind: 'git-branch-delete'; group: 'git-history'; label: string; branches: string[]; dir: Dir }
  | { kind: 'git-stash'; group: 'git-history'; label: string; which: 'drop' | 'clear'; ref: string; dir: Dir }
  | { kind: 'migrate'; group: 'database'; label: string; tool: 'alembic' | 'rails' | 'prisma' | 'django' | 'unknown'; dir: Dir }
  | { kind: 'unmeasured'; group: CommandGroup; label: string; summary: string; note: string; dir: Dir }

export type RiskOf<K extends Risk['kind']> = Extract<Risk, { kind: K }>

/** What a risky command would change, for the Shields module. */
export type Measure = { summary: string; lines: string[]; more: number; note: string }

/** A risky call held for the permission prompt, or blocked. */
export type Held = Measure & {
  /** The risky part in a few words: `rm -rf build`, `git push --force`. */
  headline: string
  who: string
  /** When the prompt was raised; null while the call is measured but not asked about yet. */
  since: number | null
  mode: 'hold' | 'block'
  /** The directive that caught it, as written. */
  directive: string
}

export type HoldDraft = Omit<Held, 'who'>

/** A held call whose permission prompt is up. */
export type ActiveHold = Held & { since: number }

export function isActiveHold(held: Held): held is ActiveHold {
  return held.since !== null
}

export function unmeasured(group: CommandGroup, label: string, summary: string, dir: Dir, note = ''): Risk {
  return { kind: 'unmeasured', group, label, summary, note, dir }
}
