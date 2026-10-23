import type { PluginState } from 'claude-code'

type StateKey = keyof PluginState['skywatch']

const JUNK: readonly unknown[] = [undefined, null, 'junk', 42, []]

/** Stored values in older or broken shapes, per state key: each must read as the current shape. */
export const STORED: { readonly [K in StateKey]: readonly unknown[] } = {
  meta: [...JUNK, {}, { schemaVersion: 1 }],
  bridge: [...JUNK, { model: 'm', isRunning: true }, { model: 'm', steps: 3, extra: 1 }, { plan: 'x', avg: null }],
  usage: [...JUNK, { pct: 50 }, { limits: [{ kind: 'five_hour', pct: 3 }], history: 'x' }],
  council: [...JUNK, { transmissions: 'bad', ids: null }, { lastAdvice: 'x', seen: ['a'] }],
  shields: [
    ...JUNK,
    { recent: 'bad', totals: { file: { rule: 2 } } },
    { recent: [], totals: { shell: { rule: 1, ask: 0, cleared: 0, refused: 0, deny: 0, blocked: 2 } }, held: { ran: 1, refused: 2 } },
    { held: { ran: 1, refused: 0, blocked: 4 } },
    { recent: [{ id: 'c', tool: 'Bash', deck: 'nowhere', verdict: 'vaporized', inSubagent: false, detail: 'x', at: 1 }, 'junk'] },
  ],
  shuttles: [
    ...JUNK,
    [undefined, {}, { id: 's1', status: 'done', tools: [{ tool: 'Read', text: 't', isError: false }] }, { status: 'exploded' }],
  ],
  probes: [...JUNK, [{ id: 'p' }, 'junk', { id: 'q', steps: 2, firstAt: 1, lastAt: 2, isDone: true }]],
  blackbox: [
    ...JUNK,
    [
      { at: 5, who: 'bridge', text: 'hi', kind: 'error' },
      { who: 7, text: null, agentId: 3, kind: 'weird', cost: 'x' },
      { at: 'x', cost: { usd: 1, tokIn: 2, tokOut: 3 } },
      { at: 6, cost: {} },
    ],
  ],
  jump: [...JUNK, { edits: 2 }],
  lastJump: [...JUNK, {}, { durationMs: 5, reason: 'answer' }],
  view: [...JUNK, { expanded: 's1', hazards: 'off' }, { deckOpen: 'nope', hazards: 'loud', unfolded: 'x' }],
  councilRoster: [...JUNK, { councilTypes: 'x' }, { councilTypes: ['architect'] }],
  totals: [...JUNK, { id: 'x', req: 4 }],
}
