import { isOneOf } from '../core'
import { RISK_GROUPS, type RiskGroup } from './risk'
import { segmentsOf } from './shell'

/** `pass` leaves a call to Claude Code, `hold` sends it to the permission prompt with its measure, `block` refuses it. */
const DIRECTIVE_MODES = ['pass', 'hold', 'block'] as const
export type DirectiveMode = (typeof DIRECTIVE_MODES)[number]

/** `target` is a group (`@delete`) or a command as typed, with `*` for anything. */
export type Directive = { mode: DirectiveMode; target: string; source: string }

/** The directives in force, and the lines that did not read. */
export type DirectiveSet = { directives: Directive[]; errors: string[] }

export const DIRECTIVES_FILE = '.claude/skywatch.directives'

/** Without directive files: deletes pass, the rest hold, nothing is blocked. */
export const DEFAULT_DIRECTIVES: readonly Directive[] = [
  { mode: 'pass', target: '@delete', source: 'default' },
  ...RISK_GROUPS.filter(group => group !== 'delete').map((group): Directive => ({ mode: 'hold', target: `@${group}`, source: 'default' })),
]

const DIRECTIVE_LINE = /^(pass|hold|block)\s+(.+)$/i
const MODE_WIDTH = Math.max(...DIRECTIVE_MODES.map(mode => mode.length))
const TARGET_WIDTH = 28

const isKnownGroup = (target: string) => isOneOf(RISK_GROUPS, target.slice(1))

/** A target that names a group (`@delete`), not a command. */
export function isGroupTarget(target: string): boolean {
  return target.startsWith('@')
}

/** Directive lines: `mode target`, `#` comments and blank lines skipped; a line that does not read is reported. */
export function parseDirectives(text: string, source: string): DirectiveSet {
  const set: DirectiveSet = { directives: [], errors: [] }
  text.split('\n').forEach((raw, index) => {
    const line = raw.replace(/(^|\s)#.*$/, '').trim()
    if (!line) return
    const match = DIRECTIVE_LINE.exec(line)
    const mode = match?.[1]?.toLowerCase()
    const target = match?.[2]?.trim() ?? ''
    if (!isOneOf(DIRECTIVE_MODES, mode) || (isGroupTarget(target) && !isKnownGroup(target))) {
      set.errors.push(`${source}:${index + 1}  ${raw.trim()}`)
      return
    }
    set.directives.push({ mode, target, source })
  })
  return set
}

const escapeRegExp = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

/** A command matches a target written as typed, or, with `*`, a glob over the whole command. */
function matchesCommand(target: string, segment: string): boolean {
  if (!target.includes('*')) return segment === target || segment.startsWith(`${target} `)
  return new RegExp(`^${target.split('*').map(escapeRegExp).join('.*')}$`).test(segment)
}

/** The directive for a call: the last one that matches its groups or its command, or null. */
export function directiveFor(directives: readonly Directive[], groups: readonly RiskGroup[], command: string): Directive | null {
  const segments = command ? segmentsOf(command) : []
  const isMatch = (directive: Directive) =>
    isGroupTarget(directive.target)
      ? groups.some(group => `@${group}` === directive.target)
      : segments.some(segment => matchesCommand(directive.target, segment))
  return directives.findLast(isMatch) ?? null
}

/** A directive as written: `hold @delete`. */
export function directiveLine(directive: Directive): string {
  return `${directive.mode} ${directive.target}`
}

/** The text `/skywatch directives` answers with. */
export function directivesReport(set: DirectiveSet): string {
  const lines = set.directives.map(d => `${d.mode.padEnd(MODE_WIDTH)}  ${d.target.padEnd(TARGET_WIDTH)}  ${d.source}`)
  const unread =
    set.errors.length > 0 ? `\n\nNot read (each line is \`pass|hold|block <@group or command>\`):\n${set.errors.join('\n')}` : ''
  return `Directives, the last match wins (~/${DIRECTIVES_FILE}, then ${DIRECTIVES_FILE}):\n${lines.join('\n')}${unread}`
}
