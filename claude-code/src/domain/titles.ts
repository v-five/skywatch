import { capitalize } from '../core'

const ROLE_BY_VERB: ReadonlyMap<string, string> = new Map([
  ['implement', 'builder'],
  ['build', 'builder'],
  ['write', 'builder'],
  ['add', 'builder'],
  ['create', 'builder'],
  ['make', 'builder'],
  ['review', 'reviewer'],
  ['check', 'reviewer'],
  ['audit', 'reviewer'],
  ['verify', 'reviewer'],
  ['validate', 'reviewer'],
  ['fix', 'fixer'],
  ['debug', 'fixer'],
  ['repair', 'fixer'],
  ['draft', 'drafter'],
  ['plan', 'planner'],
  ['design', 'designer'],
  ['test', 'tester'],
  ['refactor', 'refactorer'],
  ['research', 'researcher'],
  ['investigate', 'investigator'],
  ['explore', 'scout'],
  ['find', 'scout'],
  ['search', 'scout'],
  ['locate', 'scout'],
  ['scan', 'scout'],
  ['map', 'mapper'],
  ['document', 'writer'],
  ['summarize', 'summarizer'],
  ['update', 'updater'],
  ['migrate', 'migrator'],
])

/** Verbs whose doer is the verb with -er: run → runner, probe → prober. */
const PLAIN_VERBS: ReadonlySet<string> = new Set([
  'run',
  'rewrite',
  'probe',
  'read',
  'port',
  'rename',
  'move',
  'clean',
  'remove',
  'delete',
  'compare',
  'measure',
  'gather',
  'collect',
  'analyze',
  'analyse',
  'profile',
  'benchmark',
  'translate',
  'convert',
  'generate',
  'prepare',
  'configure',
  'install',
  'deploy',
  'merge',
  'split',
  'extract',
  'parse',
  'format',
  'lint',
  'optimize',
  'inspect',
  'trace',
  'list',
  'count',
  'sort',
  'tidy',
  'polish',
  'wire',
  'integrate',
  'upgrade',
  'bump',
  'release',
])

/** Words that end the subject: what follows is where or how, not what. */
const BREAKS: ReadonlySet<string> = new Set([
  'against',
  'from',
  'to',
  'for',
  'in',
  'into',
  'with',
  'on',
  'of',
  'by',
  'via',
  'and',
  'then',
  'before',
  'after',
])
const FILLER: ReadonlySet<string> = new Set(['the', 'a', 'an', 'all', 'our', 'my', 'this', 'that', 'new', 'existing'])
/** Words too general to name a subject while a more telling one stands before them. */
const GENERIC: ReadonlySet<string> = new Set([
  'component',
  'components',
  'file',
  'files',
  'code',
  'changes',
  'module',
  'page',
  'logic',
  'stuff',
])
const CLAUSE = /[,;:—–(]/
const WORD = /[a-z0-9][a-z0-9'-]*/g
const SUBJECT_WORDS = 2
const SHORT_VERB = /^[^aeiou]?[^aeiou][aeiou][^aeiouwxy]$/
const FALLBACK_ROLE = 'agent'

/** The doer of an unknown verb: probe → prober, run → runner, sort → sorter. */
function roleOf(verb: string): string {
  const known = ROLE_BY_VERB.get(verb)
  if (known) return known
  if (verb.endsWith('y')) return `${verb}er`
  if (verb.endsWith('e')) return `${verb}r`
  return SHORT_VERB.test(verb) ? `${verb}${verb.at(-1)}er` : `${verb}er`
}

function subjectOf(words: readonly string[]): string[] {
  const end = words.findIndex(word => BREAKS.has(word))
  const subject = (end === -1 ? words : words.slice(0, end)).filter(word => !FILLER.has(word))
  const telling = subject.length > 1 ? subject.filter(word => !GENERIC.has(word)) : subject
  return telling.slice(-SUBJECT_WORDS)
}

/** A shuttle's short name from its mission: "Implement the footer component" reads "Footer builder". */
export function shuttleTitle(mission: string, type: string): string {
  const firstClause = mission.toLowerCase().split(CLAUSE)[0] ?? ''
  const words = firstClause.match(WORD) ?? []
  const [verb, ...rest] = words
  if (!verb) return capitalize(type)
  const isVerb = ROLE_BY_VERB.has(verb) || PLAIN_VERBS.has(verb)
  const subject = subjectOf(isVerb ? rest : words)
  const role = isVerb ? roleOf(verb) : FALLBACK_ROLE
  return capitalize(subject.length > 0 ? `${subject.join(' ')} ${role}` : role)
}

/** `title`, numbered from its second use among `taken`: "Footer builder 2". */
export function uniqueTitle(title: string, taken: readonly string[]): string {
  const uses = taken.filter(other => other === title || other.startsWith(`${title} `)).length
  return uses > 0 ? `${title} ${uses + 1}` : title
}
