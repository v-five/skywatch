// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { CLASSIFIERS, destructiveSql, type Segment, WORD_RULES } from './classifiers'
import type { Dir, Risk } from './risk'
import { commandWords, joinDir, maskQuotes, rawSegmentsOf, SCRIPT_END, SCRIPT_START, stripHeredocs, withoutScriptMarks } from './shell'

/** What a segment does: a risk, or a move (`cd` sets the folder, `pushd` also saves the old one, `popd` returns to it). */
type Effect = { risk: Risk } | { cd: Dir; push?: Dir } | { pop: true } | null

/** Where the line has moved: `cd`, the pushd stack, and subshells that restore the folder when they close. */
type Scope = { dir: Dir; subshells: Dir[]; pushed: Dir[] }

const TRAILING_REDIRECTS = /(?:\s*(?:\d*>>?|&>>?|<)\s*\S+)+\s*$/

function programOf(word: string): string {
  const program = word.replace(/^\\/, '')
  return program.endsWith('/rm') ? 'rm' : program
}

function folderMove(segment: Segment, dir: Dir): Effect {
  const [target] = segment.args
  if (segment.program === 'cd') return { cd: target === '-' ? '-' : joinDir(dir, target) }
  if (segment.program === 'pushd') return { cd: joinDir(dir, target), push: dir }
  return segment.program === 'popd' ? { pop: true } : null
}

function riskOf(segment: Segment, dir: Dir): Risk | null {
  const risk = CLASSIFIERS.get(segment.program)?.(segment, dir) ?? null
  if (risk) return risk
  for (const rule of WORD_RULES) {
    const found = rule(segment, dir)
    if (found) return found
  }
  return null
}

function classifySegment(text: string, dir: Dir): Effect {
  const [first, ...args] = commandWords(text)
  if (first === undefined) return null
  const segment: Segment = { program: programOf(first), args, words: [first, ...args] }
  const folder = folderMove(segment, dir)
  if (folder) return folder
  const risk = riskOf(segment, dir)
  return risk ? { risk } : null
}

/** A risk joins the list; a move changes the scope. */
function applyEffect(effect: Effect, scope: Scope, found: Risk[]): void {
  if (!effect) return
  if ('risk' in effect) found.push(effect.risk)
  else if ('pop' in effect) scope.dir = scope.pushed.length > 0 ? (scope.pushed.pop() ?? null) : '-'
  else {
    if (effect.push !== undefined) scope.pushed.push(effect.push)
    scope.dir = effect.cd
  }
}

const bracketCount = (text: string, pattern: RegExp) => pattern.exec(text)?.[0].trim().length ?? 0

const copyOf = (scope: Scope): Scope => ({ dir: scope.dir, subshells: [...scope.subshells], pushed: [...scope.pushed] })

/** Every risky segment of a shell command, in order. */
export function classifyAll(command: string): Risk[] {
  const found: Risk[] = []
  const sql = destructiveSql(command)
  if (sql) found.push(sql)
  let scope: Scope = { dir: null, subshells: [], pushed: [] }
  const outer: Scope[] = []
  for (const raw of rawSegmentsOf(maskQuotes(stripHeredocs(withoutScriptMarks(command))))) {
    const mark = raw.trim()
    if (mark === SCRIPT_START) outer.push(copyOf(scope))
    if (mark === SCRIPT_END) scope = outer.pop() ?? scope
    if (mark === SCRIPT_START || mark === SCRIPT_END) continue
    const opens = bracketCount(raw, /^\s*\(+/)
    const closes = bracketCount(raw.replace(TRAILING_REDIRECTS, ''), /\)+\s*$/)
    for (let k = 0; k < opens; k += 1) scope.subshells.push(scope.dir)
    applyEffect(classifySegment(raw, scope.dir), scope, found)
    for (let k = 0; k < closes && scope.subshells.length > 0; k += 1) scope.dir = scope.subshells.pop() ?? null
  }
  return found
}

/** The first risky segment of a shell command, or null. */
export function classify(command: string): Risk | null {
  return classifyAll(command)[0] ?? null
}
