import type {
  Bridge,
  Council,
  CouncilRoster,
  HeldTally,
  Jump,
  LastJump,
  LineCost,
  Probe,
  SessionTotals,
  Shields,
  Shuttle,
  SpeedAvg,
  Tally,
  Usage,
  View,
} from '../../types'
import { BLACKBOX_PAGE } from './blackbox'

export const SCHEMA_VERSION = 2

export const DEFAULT_AVG: SpeedAvg = { n: 0, ttftMs: 0, nTok: 0, tokPerS: 0 }

export const ZERO_TALLY: Tally = { rule: 0, ask: 0, cleared: 0, refused: 0, deny: 0, blocked: 0 }

export const DEFAULT_HELD: HeldTally = { ran: 0, refused: 0, blocked: 0 }

export const DEFAULT_BRIDGE: Bridge = {
  model: '',
  effort: '',
  mode: '',
  steps: 0,
  isRunning: false,
  speed: null,
  doing: null,
  doingTitle: null,
  command: null,
  task: null,
  plan: [],
  avg: DEFAULT_AVG,
}

export const DEFAULT_USAGE: Usage = {
  pct: null,
  tokens: null,
  window: 0,
  costUsd: null,
  limits: [],
  compactions: 0,
  lastCompactAt: null,
  history: [],
}

export const DEFAULT_COUNCIL: Council = { transmissions: [], ids: [], seen: [], lastAdvice: '' }

export const DEFAULT_SHIELDS: Shields = {
  recent: [],
  totals: { file: ZERO_TALLY, shell: ZERO_TALLY, other: ZERO_TALLY },
  held: DEFAULT_HELD,
}

export const DEFAULT_JUMP: Jump = {
  edits: 0,
  errorStreak: 0,
  errors: 0,
  isReviewing: false,
  startedAt: 0,
  costAtStart: null,
  tokIn: 0,
  tokOut: 0,
  promptAt: null,
}

export const DEFAULT_TOTALS: SessionTotals = { id: '', firstSeen: 0, activeMs: 0, tokIn: 0, tokOut: 0, req: 0 }

export const DEFAULT_VIEW: View = {
  expanded: null,
  folded: [],
  isHangarOpen: false,
  deckOpen: null,
  unfolded: [],
  entriesShown: BLACKBOX_PAGE,
  hazards: null,
}

export const DEFAULT_COUNCIL_ROSTER: CouncilRoster = { councilTypes: [] }

export const DEFAULT_SHUTTLE: Shuttle = {
  id: '',
  type: 'agent',
  model: '',
  description: '',
  title: '',
  brief: '',
  status: 'running',
  spawnedAt: 0,
  endedAt: null,
  ctx: 0,
  out: 0,
  steps: 0,
  lastStop: null,
  tools: [],
  answer: '',
  doing: null,
  doingTitle: null,
  task: null,
  effort: '',
  speed: null,
  avg: DEFAULT_AVG,
}

export const DEFAULT_PROBE: Probe = { id: '', steps: 0, firstAt: 0, lastAt: 0, isDone: false }

export const DEFAULT_LAST_JUMP: LastJump = { durationMs: 0, shuttles: 0, edits: 0, errors: 0, costDelta: null, reason: '' }

export const DEFAULT_COST: LineCost = { usd: null, tokIn: 0, tokOut: 0 }
