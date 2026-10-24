export type Moment = 'before a plan' | 'error repeats' | 'before done'

export type Deck = 'file' | 'git' | 'shell' | 'web' | 'agents' | 'app' | 'mcp' | 'other'

/** rule: settings allowed it; ask: pending at the prompt, then cleared or refused; deny: a rule; blocked: a directive. */
export type Verdict = 'rule' | 'ask' | 'cleared' | 'refused' | 'deny' | 'blocked'

export type HazardMode = 'viewscreen' | 'beacon' | 'off'

export type ShuttleStatus = 'running' | 'done' | 'stopped' | 'failed'

export type EntryKind = 'info' | 'error' | 'transmission' | 'done'

/** Time to the first piece of a response, and output tokens per second after it. */
export type Speed = { ttftMs: number; tokPerS: number | null }

/** Running sums over measured requests, for an average. */
export type SpeedAvg = { n: number; ttftMs: number; nTok: number; tokPerS: number }

export type Meta = { schemaVersion: number }

/** A task-list step: pending, running (in progress), done, or skipped (dropped before it was done). */
export type PlanStatus = 'pending' | 'running' | 'done' | 'skipped'
export type PlanStep = { text: string; status: PlanStatus }

export type Bridge = {
  model: string
  effort: string
  mode: string
  steps: number
  isRunning: boolean
  speed: Speed | null
  /** The tool call in flight, as describeInput words it. */
  doing: string | null
  doingTitle: string | null
  /** The slash command running outside a jump, without its slash. */
  command: string | null
  task: string | null
  plan: string[]
  /** The task list with each step's status, as the plan card draws it. */
  planSteps?: PlanStep[]
  avg: SpeedAvg
}

/** One session's totals, kept in the store so they survive a restart. */
export type SessionTotals = { id: string; firstSeen: number; activeMs: number; tokIn: number; tokOut: number; req: number }

export type RateLimit = { kind: string; pct: number; resetsAt?: number | null }

export type Usage = {
  pct: number | null
  tokens: number | null
  window: number
  costUsd: number | null
  limits: RateLimit[]
  compactions: number
  lastCompactAt: number | null
  /** Context tokens after each recent jump, oldest first. */
  history: number[]
  /** What fills the context, as Claude Code's local estimate breaks it down; empty before one. */
  layers?: Layer[]
  /** The context size at which auto-compaction runs; null when it is off or unknown. */
  compactAt?: number | null
  /** Loaded into the context but not used this session, heaviest first. */
  ballast?: Ballast[]
  /** What this session has used, as `mcp:<server>`, `skill:<name>` or `agent:<type>`. */
  used?: string[]
}

/** A file the repository has changed and not committed: lines added and removed. */
export type CargoFile = { path: string; added: number; removed: number }

/** A background task: a shell left running, until its notification or a stop. */
export type Satellite = {
  id: string
  label: string
  startedAt: number
  endedAt: number | null
  status: 'running' | 'done' | 'failed' | 'stopped'
}

/** An MCP server, by the calls the session made to it. */
export type Relay = { server: string; calls: number; errors: number; lastError: string }

/** The starbase's systems around the bridge: what it carries, what orbits, and which relays answer. */
export type Station = {
  /** Files edited this session, by path, most recent last. */
  edited: { path: string; edits: number }[]
  /** Uncommitted changes, from the last look at the repository; null outside a repository or before a look. */
  changes: CargoFile[] | null
  satellites: Satellite[]
  relays: Relay[]
}

/** One part of the context: its name, its tokens, its kind and the theme colour Claude Code draws it in. */
export type Layer = { name: string; tokens: number; kind: 'used' | 'free' | 'buffer'; color: string }

/** Something loaded into the context and not used: an MCP server, a skill or an agent. */
export type Ballast = { key: string; name: string; tokens: number }

export type Transmission = { id: string; at: number; endAt: number | null; moment: Moment; via: string }

export type Council = { transmissions: Transmission[]; ids: string[]; seen: string[]; lastAdvice: string }

export type Check = { id: string; tool: string; deck: Deck; verdict: Verdict; inSubagent: boolean; detail: string; at: number }

export type Tally = { rule: number; ask: number; cleared: number; refused: number; deny: number; blocked: number }

/** Risky commands SkyWatch sent to the prompt, by how they ended. */
export type HeldTally = { ran: number; refused: number; blocked: number }

export type Shields = { recent: Check[]; totals: Partial<Record<Deck, Tally>>; held: HeldTally }

export type ToolNote = { tool: string; text: string; isError: boolean }

export type Shuttle = {
  id: string
  type: string
  model: string
  /** The mission: the Agent call's short description. */
  description: string
  /** A short name made from the mission when it launched ("Footer builder"); empty in older state. */
  title?: string
  /** The brief: the Agent call's prompt, redacted and cut. */
  brief?: string
  status: ShuttleStatus
  spawnedAt: number
  endedAt: number | null
  /** The hull now: input plus cache read and write of the latest step. */
  ctx: number
  /** Output tokens summed over its steps. */
  out: number
  /** Input and output tokens summed over its steps: what it burned, for its share of the session. */
  fuel?: number
  /** Why its last turn ended (`answer`, `aborted`, `refusal`, `error`); empty while it flies. */
  endReason?: string
  steps: number
  lastStop: string | null
  tools: ToolNote[]
  answer: string
  doing: string | null
  doingTitle: string | null
  task: string | null
  effort: string
  speed: Speed | null
  avg: SpeedAvg
}

/** A model loop no shuttle claims, such as a workflow agent or a compaction fork. */
export type Probe = { id: string; steps: number; firstAt: number; lastAt: number; isDone: boolean }

export type LineCost = { usd: number | null; tokIn: number; tokOut: number }

export type BlackboxEntry = {
  at: number
  who: string
  text: string
  agentId: string | null
  kind: EntryKind
  /** On a prompt line, once its jump ends: what that jump cost. */
  cost: LineCost | null
}

export type Jump = {
  edits: number
  errorStreak: number
  errors: number
  isReviewing: boolean
  startedAt: number
  costAtStart: number | null
  tokIn: number
  tokOut: number
  /** The `at` of the black box entry that opened the jump. */
  promptAt: number | null
  /** Edits this jump, by file. */
  editsByFile?: Record<string, number>
}

export type LastJump = { durationMs: number; shuttles: number; edits: number; errors: number; costDelta: number | null; reason: string }

export type View = {
  /** The docked shuttle opened past its title row. */
  expanded: string | null
  /** Shuttles in flight the person folded to their title row. */
  folded?: string[]
  /** Modules the person folded to their title row, by name. */
  collapsed?: string[]
  /** Whether the hangar shows its docked shuttles. */
  isHangarOpen?: boolean
  deckOpen: Deck | null
  /** Long texts opened past two lines, by fold key. */
  unfolded: string[]
  entriesShown: number
  /** This session's /skywatch hazards choice; null follows the setting. */
  hazards: HazardMode | null
}

export type CouncilRoster = { councilTypes: string[] }

declare module 'claude-code' {
  interface PluginState {
    skywatch: {
      meta: Meta
      bridge: Bridge
      usage: Usage
      council: Council
      shields: Shields
      shuttles: Shuttle[]
      probes: Probe[]
      blackbox: BlackboxEntry[]
      jump: Jump
      lastJump: LastJump | null
      view: View
      councilRoster: CouncilRoster
      totals: SessionTotals
      station: Station
    }
  }
}
