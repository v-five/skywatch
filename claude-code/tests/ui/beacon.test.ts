import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_COUNCIL, DEFAULT_SHIELDS, DEFAULT_USAGE, newShuttle, openTransmission, recordCheck } from '../../src/domain'
import { beaconText, gaugeCells, hazardOf, ringOf } from '../../src/ui'
import { PERCENTS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

describe('hazard scale', () => {
  test('hazardOf, ringOf and gauges match the pre-refactor output', () => {
    const asBefore = (pct: number) => {
      const hazard = hazardOf(pct)
      return { ...hazard, upTo: Number.isFinite(hazard.upTo) ? hazard.upTo : 1e9 }
    }
    expect(PERCENTS.map(asBefore)).toEqual(GOLDEN.hazardOf)
    expect(PERCENTS.map(ringOf)).toEqual([...GOLDEN.ringOf])
    expect(PERCENTS.map(pct => gaugeCells(pct, 10))).toEqual(GOLDEN.gauge)
  })
})

describe('beacon', () => {
  const base = { usage: DEFAULT_USAGE, council: DEFAULT_COUNCIL, shields: DEFAULT_SHIELDS, fleet: [] }

  test('before any reading: clear space at 0%', () => {
    expect(beaconText(base)).toBe('✦ Clear space · ○ 0%')
  })

  test('shuttles, the council and stops join the hazard', () => {
    const shuttle = newShuttle({ id: 's', type: 'Explore', model: '', description: '', spawnedAt: 1 })
    const council = openTransmission(DEFAULT_COUNCIL, { id: 'a', at: 1, moment: 'before done', via: 'architect' })
    const shields = recordCheck(DEFAULT_SHIELDS, {
      id: 'c',
      tool: 'Bash',
      deck: 'shell',
      verdict: 'deny',
      inSubagent: false,
      detail: '',
      at: 1,
    })
    expect(beaconText({ usage: { ...DEFAULT_USAGE, pct: 54.4 }, council, shields, fleet: [shuttle] })).toBe(
      '☁ Gas cloud · ◑ 54% · shuttles 1/1 · council transmitting · stopped 1',
    )
  })
})
