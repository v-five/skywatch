import type { TurnCompleteReason } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import {
  addShuttle,
  applyStep,
  dropProbe,
  endProbe,
  fuelShare,
  isProbeActive,
  landShuttle,
  lostReason,
  newShuttle,
  noteTool,
  plainReport,
  shownShuttles,
  shuttleTitle,
  statusOf,
  stepProbe,
  titleOf,
  uniqueTitle,
  withShuttle,
} from '../../src/domain'
import type { Shuttle } from '../../types'

const shuttle = (id: string, spawnedAt = 1000) =>
  newShuttle([], { id, type: 'Explore', model: '', description: 'scan the repo', prompt: 'Scan the repo, token=abc123', spawnedAt })

describe('a shuttle', () => {
  test('steps, notes tools and lands', () => {
    const step = { model: 'm', usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 7 }, stopReason: 'end_turn' }
    const stepped = applyStep(shuttle('s1'), step)
    expect(stepped).toMatchObject({ model: 'm', steps: 1, ctx: 15, out: 7, lastStop: 'end_turn' })
    const noted = [1, 2, 3, 4].reduce((s, n) => noteTool(s, { tool: 'Read', text: `t${n}`, isError: false }), stepped)
    expect(noted.tools.map(t => t.text)).toEqual(['t2', 't3', 't4'])
    const landed = landShuttle(noted, { status: statusOf('answer'), at: 5000, answer: 'done it' })
    expect(landed).toMatchObject({ status: 'done', endedAt: 5000, answer: 'done it', doing: null })
    expect([statusOf('aborted'), statusOf('error')]).toEqual(['stopped', 'failed'])
  })

  test('a completion reason a newer engine adds reads as failed', () => {
    const reason: string = 'max_turns'
    expect(statusOf(reason as TurnCompleteReason)).toBe('failed')
  })

  test('its title is made from its mission, and its brief is kept redacted', () => {
    expect(titleOf(shuttle('s'))).toBe('Repo scout')
    expect(shuttle('s').brief).not.toContain('abc123')
    expect(titleOf({ ...shuttle('s'), title: '' })).toBe('Repo scout')
  })

  test('titles name the doer and the subject of a mission', () => {
    const titles = [
      'Implement the footer component',
      'Check refactor against the plan',
      'Draft architecture from brief',
      'Review draft, write final architecture',
      'Probe classifier table with prototype keys',
      'Run tests',
      'Explore',
      'Footer component',
      '',
    ].map(mission => shuttleTitle(mission, 'general-purpose'))
    expect(titles).toEqual([
      'Footer builder',
      'Refactor reviewer',
      'Architecture drafter',
      'Draft reviewer',
      'Classifier table prober',
      'Tests runner',
      'Scout',
      'Footer agent',
      'General-purpose',
    ])
  })

  test('a title already flying is numbered', () => {
    expect(uniqueTitle('Footer builder', ['Repo scout'])).toBe('Footer builder')
    expect(uniqueTitle('Footer builder', ['Footer builder', 'Footer builder 2'])).toBe('Footer builder 3')
  })
})

describe('the fleet', () => {
  test('keeps 24 and changes one shuttle by id', () => {
    const fleet = Array.from({ length: 24 }, (_, i) => shuttle(`s${i}`)).reduce<Shuttle[]>(addShuttle, [])
    const grown = addShuttle(fleet, shuttle('new'))
    expect(grown).toHaveLength(24)
    expect(grown.at(-1)?.id).toBe('new')
    expect(withShuttle(fleet, 's3', s => ({ ...s, steps: 9 })).find(s => s.id === 's3')?.steps).toBe(9)
  })

  test('shows those in flight first, then the docked ones newest first', () => {
    const fleet = [
      landShuttle(shuttle('a'), { status: 'done', at: 1, answer: '' }),
      shuttle('b'),
      landShuttle(shuttle('c'), { status: 'failed', at: 2, answer: '' }),
    ]
    expect(shownShuttles(fleet, 6).map(s => s.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('probes', () => {
  test('step, end, drop and go quiet', () => {
    const probes = stepProbe(stepProbe([], 'p', 1000), 'p', 2000)
    expect(probes).toEqual([{ id: 'p', steps: 2, firstAt: 1000, lastAt: 2000, isDone: false }])
    const [probe] = probes
    expect(probe && isProbeActive(probe, 10_000)).toBe(true)
    expect(probe && isProbeActive(probe, 20_000)).toBe(false)
    expect(endProbe(probes, 'p', 3000)[0]?.isDone).toBe(true)
    expect(dropProbe(probes, 'p')).toEqual([])
  })
})

describe('a shuttle landed', () => {
  test('one that did not dock says why', () => {
    const flying = shuttle('s')
    expect(lostReason(flying)).toBeNull()
    expect(lostReason(landShuttle(flying, { status: 'failed', at: 2, answer: '', reason: 'error' }))).toBe('an API error ended it')
    expect(lostReason(landShuttle(flying, { status: 'stopped', at: 2, answer: '', reason: 'aborted' }))).toBe('stopped before it answered')
    expect(lostReason({ ...flying, lastStop: 'max_tokens' })).toBe('it ran out of output tokens')
    expect(lostReason(landShuttle(flying, { status: 'done', at: 2, answer: 'ok', reason: 'answer' }))).toBeNull()
  })

  test('its share of the session, and its report as prose', () => {
    const step = { model: 'm', usage: { input_tokens: 30, output_tokens: 20 }, stopReason: 'end_turn' }
    expect(fuelShare(applyStep(shuttle('s'), step), 200)).toBe(25)
    expect(fuelShare(shuttle('s'), 0)).toBeNull()
    expect(plainReport('## Done\n**All** `tests` pass.\n> note')).toBe('Done All tests pass. note')
  })
})
