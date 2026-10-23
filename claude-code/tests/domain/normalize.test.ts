import type { PluginState } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import {
  DEFAULT_BRIDGE,
  DEFAULT_COUNCIL,
  DEFAULT_COUNCIL_ROSTER,
  DEFAULT_HELD,
  DEFAULT_JUMP,
  DEFAULT_LAST_JUMP,
  DEFAULT_PROBE,
  DEFAULT_SHIELDS,
  DEFAULT_SHUTTLE,
  DEFAULT_TOTALS,
  DEFAULT_USAGE,
  DEFAULT_VIEW,
  normalizeBlackbox,
  normalizeBridge,
  normalizeCouncil,
  normalizeCouncilRoster,
  normalizeJump,
  normalizeLastJump,
  normalizeMeta,
  normalizeProbes,
  normalizeShields,
  normalizeShuttles,
  normalizeTotals,
  normalizeUsage,
  normalizeView,
} from '../../src/domain'
import { STORED } from '../support/fixtures'

type StateKey = keyof PluginState['skywatch']

const ENTRY_KEYS = ['agentId', 'at', 'cost', 'kind', 'text', 'who']
const keysOf = (value: object) => Object.keys(value).sort()
const typeOf = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)

/** For each key: its normalizer, and the fields each read value (or each item of a list) must have. */
const SHAPES: { readonly [K in StateKey]: { read: (stored: unknown) => unknown; keys: string[]; shape?: object } } = {
  meta: { read: normalizeMeta, keys: ['schemaVersion'] },
  bridge: { read: normalizeBridge, keys: keysOf(DEFAULT_BRIDGE), shape: DEFAULT_BRIDGE },
  usage: { read: normalizeUsage, keys: keysOf(DEFAULT_USAGE), shape: DEFAULT_USAGE },
  council: { read: normalizeCouncil, keys: keysOf(DEFAULT_COUNCIL), shape: DEFAULT_COUNCIL },
  shields: { read: normalizeShields, keys: keysOf(DEFAULT_SHIELDS) },
  shuttles: { read: normalizeShuttles, keys: keysOf(DEFAULT_SHUTTLE), shape: DEFAULT_SHUTTLE },
  probes: { read: normalizeProbes, keys: keysOf(DEFAULT_PROBE), shape: DEFAULT_PROBE },
  blackbox: { read: normalizeBlackbox, keys: ENTRY_KEYS },
  jump: { read: normalizeJump, keys: keysOf(DEFAULT_JUMP), shape: DEFAULT_JUMP },
  lastJump: { read: normalizeLastJump, keys: keysOf(DEFAULT_LAST_JUMP), shape: DEFAULT_LAST_JUMP },
  view: { read: normalizeView, keys: keysOf(DEFAULT_VIEW), shape: DEFAULT_VIEW },
  councilRoster: { read: normalizeCouncilRoster, keys: keysOf(DEFAULT_COUNCIL_ROSTER) },
  totals: { read: normalizeTotals, keys: keysOf(DEFAULT_TOTALS), shape: DEFAULT_TOTALS },
}

/** Fields missing from a read value, or of another type than their non-null default. */
function badFields(item: Record<string, unknown>, keys: string[], shape: object | undefined): string[] {
  const missing = keys.filter(name => !(name in item))
  const typed = Object.entries(shape ?? {}).filter(([, fallback]) => fallback !== null)
  return [...missing, ...typed.filter(([name, fallback]) => typeOf(item[name]) !== typeOf(fallback)).map(([name]) => name)]
}

describe('every stored value reads as the current shape', () => {
  for (const key of Object.keys(SHAPES) as StateKey[]) {
    test(key, () => {
      const { read, keys, shape } = SHAPES[key]
      for (const stored of STORED[key]) {
        const value = read(stored)
        if (value === null) continue
        for (const item of Array.isArray(value) ? value : [value]) expect(badFields(item, keys, shape)).toEqual([])
      }
    })
  }
})

describe('reading older values', () => {
  test('a field of the wrong type takes its default', () => {
    expect(normalizeBridge({ model: null, steps: '3' })).toMatchObject({ model: '', steps: 0 })
    expect(normalizeShields({ recent: [{ verdict: 'ask' }, { id: 'c', verdict: 'ask' }] }).recent).toEqual([
      { id: 'c', tool: '', deck: 'other', verdict: 'ask', inSubagent: false, detail: '', at: 0 },
    ])
  })

  test('junk reads as the defaults; stored fields are kept', () => {
    expect(normalizeBridge('junk')).toEqual(DEFAULT_BRIDGE)
    expect(normalizeBridge({ model: 'm', steps: 3 })).toEqual({ ...DEFAULT_BRIDGE, model: 'm', steps: 3 })
  })

  test('shields: held.blocked is filled; an unknown verdict reads as stopped, an unknown deck as other', () => {
    expect(normalizeShields({ held: { ran: 1, refused: 2 } }).held).toEqual({ ...DEFAULT_HELD, ran: 1, refused: 2 })
    const [check] = normalizeShields(STORED.shields.at(-1)).recent
    expect(check).toMatchObject({ verdict: 'deny', deck: 'other' })
  })

  test('a shuttle in an unknown status has landed', () => {
    expect(normalizeShuttles([{ status: 'exploded' }, { status: 'done' }]).map(s => s.status)).toEqual(['stopped', 'done'])
  })

  test('black box entries read field by field; a cost gets its missing fields', () => {
    expect(normalizeBlackbox(STORED.blackbox.at(-1))).toEqual([
      { at: 5, who: 'bridge', text: 'hi', agentId: null, kind: 'error', cost: null },
      { at: 0, who: '7', text: '', agentId: null, kind: 'info', cost: null },
      { at: 0, who: '', text: '', agentId: null, kind: 'info', cost: { usd: 1, tokIn: 2, tokOut: 3 } },
      { at: 6, who: '', text: '', agentId: null, kind: 'info', cost: { usd: null, tokIn: 0, tokOut: 0 } },
    ])
  })

  test('a field whose default is null keeps only null or a value of its type', () => {
    expect(normalizeUsage({ pct: '50', tokens: 9, costUsd: 'x', lastCompactAt: {} })).toMatchObject({
      pct: null,
      tokens: 9,
      costUsd: null,
      lastCompactAt: null,
    })
    expect(normalizeLastJump({ costDelta: '1' })?.costDelta).toBeNull()
    expect(normalizeBridge({ speed: { ttftMs: 5 }, doing: 3, task: 'read' })).toMatchObject({ speed: null, doing: null, task: 'read' })
    expect(normalizeBridge({ speed: { ttftMs: 5, tokPerS: null } }).speed).toEqual({ ttftMs: 5, tokPerS: null })
    expect(normalizeShuttles([{ endedAt: 'x', lastStop: 7 }])[0]).toMatchObject({ endedAt: null, lastStop: null })
    expect(normalizeJump({ costAtStart: '0.5', promptAt: 4 })).toMatchObject({ costAtStart: null, promptAt: 4 })
    expect(normalizeBlackbox([{ cost: { usd: 'x' } }])[0]?.cost).toEqual({ usd: null, tokIn: 0, tokOut: 0 })
    expect(normalizeView({ expanded: 3 }).expanded).toBeNull()
  })

  test('the last jump fills its fields, or is null', () => {
    expect(normalizeLastJump({})).toEqual(DEFAULT_LAST_JUMP)
    expect(normalizeLastJump('junk')).toBeNull()
  })

  test('view drops an unknown deck and hazards', () => {
    expect(normalizeView({ deckOpen: 'nope', hazards: 'loud', expanded: 's1' })).toEqual({ ...DEFAULT_VIEW, expanded: 's1' })
  })
})

describe('reading stored lists', () => {
  test('list items of the wrong shape are dropped or filled', () => {
    expect(normalizeBridge({ plan: ['a', 3, null] }).plan).toEqual(['a'])
    expect(normalizeUsage({ limits: [null, { kind: 'five_hour' }], history: [1, 'x', Number.NaN] })).toMatchObject({
      limits: [{ kind: 'five_hour', pct: 0 }],
      history: [1],
    })
    expect(normalizeCouncil({ transmissions: ['x', { id: 't', moment: 'whenever' }], ids: [1, 'a1'] })).toMatchObject({
      transmissions: [{ id: 't', at: 0, endAt: null, moment: 'before a plan', via: '' }],
      ids: ['a1'],
    })
    expect(normalizeShuttles([{ tools: [null, { tool: 'Read' }] }])[0]?.tools).toEqual([{ tool: 'Read', text: '', isError: false }])
    expect(Object.keys(normalizeShields({ totals: { file: {}, nowhere: {} } }).totals)).not.toContain('nowhere')
  })
})
