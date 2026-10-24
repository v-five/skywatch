import { describe, expect, test } from 'claude-code/testing'
import { DEFAULT_DIRECTIVES, directiveFor, directiveLine, directivesReport, parseDirectives, type RiskGroup } from '../../src/forcefield'
import { DIRECTIVE_CALLS, DIRECTIVE_TEXTS } from '../support/corpus'
import { GOLDEN } from '../support/golden'

describe('directives', () => {
  test('parseDirectives matches the pre-refactor output', () => {
    expect(DIRECTIVE_TEXTS.map(text => parseDirectives(text, 'src'))).toEqual(GOLDEN.parseDirectives)
  })

  test('directiveFor matches the pre-refactor output: the last match wins', () => {
    const found = DIRECTIVE_CALLS.map(call =>
      DIRECTIVE_TEXTS.map(text =>
        directiveFor([...DEFAULT_DIRECTIVES, ...parseDirectives(text, 'src').directives], call.groups as RiskGroup[], call.command),
      ),
    )
    expect(found).toEqual(GOLDEN.directiveFor)
  })

  test('directiveLine and the report read as before', () => {
    expect(directiveLine({ mode: 'hold', target: '@delete', source: 'x' })).toBe('hold @delete')
    const report = directivesReport({ directives: [{ mode: 'block', target: 'git push', source: 'p' }], errors: ['p:2  wat'] })
    expect(report).toBe(
      'Directives, the last match wins (~/.claude/skywatch.directives, then .claude/skywatch.directives):\n' +
        'block  git push                      p\n\n' +
        'Not read (each line is `pass|hold|block <@group or command>` or `compact at <step or N%>`):\np:2  wat',
    )
  })
})

test('compact at a hazard step or a percent; anything else does not read', () => {
  expect(parseDirectives('compact at ion-storm', 'p').compact).toEqual({ pct: 80, target: 'ion-storm', source: 'p' })
  expect(parseDirectives('compact at 85%', 'p').compact).toEqual({ pct: 85, target: '85%', source: 'p' })
  expect(parseDirectives('compact at loud', 'p').errors).toEqual(['p:1  compact at loud'])
})
