// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { baseName } from '../core'
import type { Dir } from './risk'

const SHELLS: ReadonlySet<string> = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
const PREFIXES: ReadonlySet<string> = new Set(['command', 'exec', 'env', 'nohup', 'time', 'then', 'do', 'else', '!'])
const SUDO_VALUE_OPTIONS: ReadonlySet<string> = new Set(['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-T', '-U'])
const ENV_VALUE_OPTIONS: ReadonlySet<string> = new Set(['-u', '-C', '-S', '--unset', '--chdir', '--split-string'])
const SHELL_VALUE_OPTIONS: ReadonlySet<string> = new Set(['--rcfile', '--init-file'])
const XARGS_VALUE_OPTIONS: ReadonlySet<string> = new Set(['-I', '-L', '-n', '-P', '-s', '-E', '-d', '-a'])
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
const NO_VALUE_OPTIONS: ReadonlySet<string> = new Set()
/** A shell flag set that takes a script: `-c`, `-lc`, `-ec`. */
const SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/
/** `<<word`, `<<-word`, `<<'word'`; not the here-string `<<<`. */
const HEREDOC = /(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/g
const QUOTED_SEPARATOR = /[;&|\n]/
/** `&&`, `||`, `|&`, `;`, `|`, a newline, and a lone `&` that sends a command to the background (not `>&` or `&>`). */
const SEPARATORS = /&&|\|\||\|&|;|\||\n|(?<![>&])&(?![>&])/
/** Segments that open and close a script a new shell runs: its folder moves end with it, whatever brackets it holds. */
export const SCRIPT_START = '\u0001'
export const SCRIPT_END = '\u0002'

/** The command with any script markers of its own blanked, so its text cannot close a script. */
export const withoutScriptMarks = (command: string) => command.replaceAll(SCRIPT_START, ' ').replaceAll(SCRIPT_END, ' ')

/** What runs a script: `eval` in the line's own shell, or a new shell. */
type ScriptRunner = 'eval' | 'shell' | null

/** The index of the quote that closes the one at `start`; a double-quoted string skips escaped characters. */
function closingQuote(command: string, start: number): number {
  const quote = command[start]
  let end = start + 1
  while (end < command.length && command[end] !== quote) end += quote === '"' && command[end] === '\\' ? 2 : 1
  return end
}

/** Whether `index` falls inside quotes; an escaped quote outside them opens nothing. */
function isQuotedAt(line: string, index: number): boolean {
  for (let i = 0; i < index; i += 1) {
    if (line[i] === '\\') i += 1
    else if (line[i] === "'" || line[i] === '"') {
      const end = closingQuote(line, i)
      if (index <= end) return true
      i = end
    }
  }
  return false
}

/** Whether a line hands its here-document to a shell (`bash <<EOF`, `cat <<EOF | sh`), which runs the body. */
function feedsShell(line: string): boolean {
  return segmentsOf(maskQuotes(line)).some(segment => {
    const words = leadingWords(segment)
    return SHELLS.has(baseName(words[0] ?? ''))
  })
}

type Heredoc = { word: string; hasDash: boolean; isScript: boolean }

const endsHeredoc = (line: string, { word, hasDash }: Heredoc) => (hasDash ? line.replace(/^\t+/, '') : line) === word

/** The here-documents a line opens, in order; a `<<` inside quotes opens none. */
function heredocsOn(line: string): Heredoc[] {
  const isScript = feedsShell(line)
  return [...line.matchAll(HEREDOC)]
    .filter(match => !isQuotedAt(line, match.index))
    .map(match => ({ word: match[3] ?? '', hasDash: match[1] === '-', isScript }))
}

// A here-document body is data for the command, not commands: `rm -rf` inside one is not run.
// A body a shell reads is a script: it stays, between script markers, so its `cd` ends with it.
export function stripHeredocs(command: string): string {
  const kept: string[] = []
  let open: Heredoc[] = []
  for (const line of command.split('\n')) {
    const [heredoc] = open
    if (!heredoc) {
      kept.push(line)
      open = heredocsOn(line)
    } else if (endsHeredoc(line, heredoc)) {
      open = open.slice(1)
      if (heredoc.isScript) kept.push(SCRIPT_END)
    } else {
      if (heredoc.isScript) kept.push(line)
      continue
    }
    if (open[0]?.isScript) kept.push(SCRIPT_START)
  }
  return kept.join('\n')
}

/** What runs the quoted text the segment so far reaches: `eval`, or a shell (`bash -c`, `sudo sh -lc`, `xargs sh -c`, `bash <<<`). */
function scriptRunner(segmentSoFar: string): ScriptRunner {
  const words = leadingWords(segmentSoFar)
  if (words[0] === 'xargs') {
    words.shift()
    dropOptions(words, XARGS_VALUE_OPTIONS)
  }
  return dropShell(words)
}

/** The text a quoted stretch stands for: single quotes keep it as is; double quotes drop the `\` before `\ " $ \`` and a newline, as bash does. */
function unquote(quoted: string): string {
  const quote = quoted[0] ?? ''
  const text = quoted.length > 1 && quoted.endsWith(quote) ? quoted.slice(1, -1) : quoted.slice(1)
  return quote === "'" ? text : text.replace(/\\([\\"$`\n])/g, (_, char: string) => (char === '\n' ? '' : char))
}

/**
 * Quoted text in its masked form: emptied when it holds a separator, so it splits nothing. A script is unquoted
 * instead, so its commands are read like the line's own: `eval`'s in place, a new shell's between script markers.
 */
function maskedQuote(quoted: string, segmentSoFar: string): string {
  const runner = scriptRunner(segmentSoFar)
  if (runner === 'eval') return `;${maskQuotes(unquote(quoted))};`
  if (runner === 'shell') return `;${SCRIPT_START};${maskQuotes(unquote(quoted))};${SCRIPT_END};`
  return QUOTED_SEPARATOR.test(quoted) ? (quoted[0] ?? '').repeat(2) : quoted
}

/** The command with each quoted stretch masked; an escaped character outside quotes stays as it is. */
export function maskQuotes(command: string): string {
  let out = ''
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i] ?? ''
    if (char === '\\') {
      out += command.slice(i, i + 2)
      i += 1
    } else if (char === "'" || char === '"') {
      const end = closingQuote(command, i)
      out += maskedQuote(command.slice(i, end + 1), out.split(QUOTED_SEPARATOR).at(-1) ?? '')
      i = end
    } else out += char
  }
  return out
}

/** The raw segments, untrimmed, for the scope tracking that reads their brackets. */
export function rawSegmentsOf(command: string): string[] {
  return command.split(SEPARATORS)
}

/** The commands a shell line runs, split at `&&`, `||`, `;`, pipes, a lone `&` and newlines. */
export function segmentsOf(command: string): string[] {
  return rawSegmentsOf(command)
    .map(segment => segment.trim())
    .filter(Boolean)
}

/** Words of one segment, honouring quotes: good enough to read flags and paths. */
export function tokenize(text: string): string[] {
  return [...text.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g)].map(match => match[1] ?? match[2] ?? match[3] ?? '')
}

function dropWhile(words: string[], test: (word: string) => boolean): void {
  while (words.length > 0 && test(words[0] ?? '')) words.shift()
}

/** Drops a prefix's options: `env -i`, `env -u NAME`, `time -p`. */
function dropOptions(words: string[], valueOptions: ReadonlySet<string>): void {
  while (words.length > 0 && (words[0] ?? '').startsWith('-')) {
    const option = words.shift() ?? ''
    if (option === '--') return
    if (valueOptions.has(option)) words.shift()
  }
}

function dropPrefixes(words: string[]): void {
  while (words.length > 0 && (PREFIXES.has(words[0] ?? '') || ASSIGNMENT.test(words[0] ?? ''))) {
    const prefix = words.shift()
    if (prefix === 'env') dropOptions(words, ENV_VALUE_OPTIONS)
    if (prefix === 'time') dropOptions(words, NO_VALUE_OPTIONS)
  }
}

/** Drops `VAR=value`, sudo, prefixes and nice, with their options. */
function dropLeading(words: string[]): void {
  dropWhile(words, word => ASSIGNMENT.test(word))
  if (words[0] === 'sudo') {
    words.shift()
    dropOptions(words, SUDO_VALUE_OPTIONS)
  }
  dropPrefixes(words)
  if (words[0] === 'nice') {
    words.shift()
    const flag = words.at(0) ?? ''
    if (flag === '-n') words.splice(0, 2)
    else if (/^-\d+$/.test(flag)) words.shift()
  }
}

/** Drops `eval`, or a shell handed a script (`bash -c`, `sh -lc`, `bash <<<`) with its options; says which it dropped. */
function dropShell(words: string[]): ScriptRunner {
  const program = baseName(words[0] ?? '')
  if (program === 'eval') {
    words.shift()
    return 'eval'
  }
  if (!SHELLS.has(program)) return null
  const { end, hasScript } = shellOptions(words)
  const next = words[end] ?? ''
  if (next.startsWith('<<<')) {
    words.splice(0, end + 1, ...(next.length > 3 ? [next.slice(3)] : []))
    return 'shell'
  }
  if (hasScript) {
    words.splice(0, end)
    return 'shell'
  }
  // A -c the options were misread past still runs a script: the words after it are read as one.
  const flag = words.findIndex((word, i) => i > 0 && SCRIPT_FLAG.test(word))
  if (flag < 0) return null
  words.splice(0, flag + 1)
  return 'shell'
}

/** How many values a shell option takes: one per `o` or `O` in a flag set (`-euo pipefail`), one for `--rcfile`. */
function valueCount(option: string): number {
  if (option.startsWith('--')) return SHELL_VALUE_OPTIONS.has(option) ? 1 : 0
  return [...option.slice(1)].filter(letter => letter === 'o' || letter === 'O').length
}

/** Where a shell's options end, past `--`, and whether one of them takes a script. */
function shellOptions(words: readonly string[]): { end: number; hasScript: boolean } {
  let end = 1
  let hasScript = false
  while (end < words.length && /^[-+]./.test(words[end] ?? '') && words[end] !== '--') {
    const option = words[end] ?? ''
    hasScript ||= SCRIPT_FLAG.test(option)
    end += 1 + valueCount(option)
  }
  return { end: words[end] === '--' ? end + 1 : end, hasScript }
}

/** A segment's words from the first one that is not a prefix: brackets, `VAR=value`, sudo, prefixes and nice dropped. */
function leadingWords(segment: string): string[] {
  const words = tokenize(
    segment
      .trim()
      .replace(/^[({]+\s*/, '')
      .replace(/\s*[)}]+$/, ''),
  )
  dropLeading(words)
  return words
}

/** A segment's words from the real command on; a script a shell runs (`bash -c rm …`) is the command. */
export function commandWords(segment: string): string[] {
  const words = leadingWords(segment)
  while (dropShell(words)) dropLeading(words)
  return words
}

/** The folder a later `cd arg` moves to, given the folder so far. */
export function joinDir(dir: Dir, arg: string | undefined): string {
  if (arg === undefined || arg === '~' || arg.startsWith('/') || arg.startsWith('~/')) return arg ?? '~'
  return dir ? `${dir}/${arg}` : arg
}
