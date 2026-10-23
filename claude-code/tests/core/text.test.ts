import { expect, test } from 'claude-code/testing'
import { capitalize, plural, shorten } from '../../src/core'
import { SHORTEN_CASES } from '../support/corpus'
import { GOLDEN } from '../support/golden'

test('shorten matches the pre-refactor output', () => {
  expect(SHORTEN_CASES.map(([text, max]) => shorten(text, max))).toEqual([...GOLDEN.shorten])
})

test('plural, regular and irregular', () => {
  expect([0, 1, 2].map(n => plural(n, 'error'))).toEqual([...GOLDEN.plural])
  expect(plural(3, 'stash', 'stashes')).toBe('3 stashes')
})

test('capitalize', () => {
  expect(['captain', 'Explore', '', 'x'].map(capitalize)).toEqual(['Captain', 'Explore', '', 'X'])
})
