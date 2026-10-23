import type { EngineInterface } from 'claude-code'
import { type Places, plural, relativePaths, shorten } from '../core'
import { commandOf, describeInput, READ_TOOLS, SHELL_TOOLS } from '../domain'
import { classifyAll } from './classify'
import { type Directive, directiveFor, directiveLine, isGroupTarget } from './directives'
import { isTempOnly, resolveDir } from './folders'
import { measure, plainMeasure } from './measure'
import type { HoldDraft, Measure, Risk, RiskGroup } from './risk'
import { secretFileOf } from './secrets'

const HEADLINE_MAX = 70
const COMMAND_SUMMARY_MAX = 60

type CallFacts = { readonly tool: string; readonly input: unknown; readonly places: Places }

function partOf(risk: Risk): string {
  if (risk.kind === 'rm') return `${risk.label} ${risk.targets.join(' ')}`
  return risk.kind === 'git-branch-delete' ? `git branch -D ${risk.branches.join(' ')}` : risk.label
}

/** The risky part in a few words, and how many more there are. */
export function headlineOf(risks: readonly Risk[]): string {
  const [first] = risks
  if (!first) return ''
  return shorten(partOf(first), HEADLINE_MAX) + (risks.length > 1 ? ` (+${risks.length - 1} more)` : '')
}

function secretVerb(tool: string): string {
  if (READ_TOOLS.has(tool)) return 'read'
  return SHELL_TOOLS.has(tool) ? 'touch' : 'change'
}

/** Where the first risk runs, measured: the session folder, moved by `cd dir &&` or `git -C dir`. */
async function measureFirst($: EngineInterface, risk: Risk, sessionCwd: string): Promise<Measure> {
  const home = (await resolveDir($, sessionCwd, '.')) ?? sessionCwd
  const cwd = risk.dir ? await resolveDir($, sessionCwd, risk.dir) : home
  if (cwd === null)
    return plainMeasure(`${risk.label} in ${risk.dir}`, `Couldn't find the folder ${risk.dir}, so it could not be measured.`)
  const isInside = cwd === home || cwd.startsWith(`${home}/`)
  // git reads a repository's own config, so only the session's folder is measured with it.
  if (risk.kind.startsWith('git') && !isInside)
    return plainMeasure(`${risk.label} in ${cwd}`, 'Not measured: that repository is outside the session folder.')
  return measure($, risk, cwd)
}

/** The measure of a command's risks, or null when it only touches temp folders. */
async function measureRisks($: EngineInterface, risks: readonly Risk[]): Promise<Measure | null> {
  const [first] = risks
  if (!first) return null
  const extra = risks.length > 1 ? ` (+${plural(risks.length - 1, 'more risky part')})` : ''
  try {
    const sessionCwd = await $.session.cwd()
    if (await isTempOnly($, risks, sessionCwd)) return null
    const report = await measureFirst($, first, sessionCwd)
    return { ...report, summary: report.summary + extra }
  } catch {
    return plainMeasure(`${first.label} (could not measure it)${extra}`)
  }
}

/** What makes a call risky, by the directives: a destructive command, a dotenv file, or both; null to let it pass. */
export async function holdFor($: EngineInterface, call: CallFacts, directives: readonly Directive[]): Promise<HoldDraft | null> {
  const command = call.tool === 'Bash' ? commandOf(call.input) : ''
  const risks = command ? classifyAll(command) : []
  const secret = secretFileOf(call.tool, call.input)
  const groups = [...new Set<RiskGroup>([...risks.map(risk => risk.group), ...(secret ? (['secrets'] as const) : [])])]
  const directive = directiveFor(directives, groups, command)
  if (!directive || directive.mode === 'pass') return null
  const secretLine = secret ? `${secretVerb(call.tool)} ${secret}, which may hold secrets` : ''
  const draft: HoldDraft = {
    headline: shorten(relativePaths(command, call.places) || describeInput(call.tool, call.input, call.places), HEADLINE_MAX),
    since: null,
    ...plainMeasure(secretLine || `run ${shorten(command, COMMAND_SUMMARY_MAX)}, which a directive covers`),
    mode: directive.mode,
    directive: directiveLine(directive),
  }
  if (directive.mode === 'block' || risks.length === 0) return draft
  const measured = await measureRisks($, risks)
  // An rm only inside temp folders is nothing to hold, unless a directive names the command or a secret is involved.
  if (!measured) return isGroupTarget(directive.target) && !secret ? null : draft
  return {
    ...draft,
    headline: headlineOf(risks),
    ...measured,
    summary: secret ? `${measured.summary}, and ${secretLine}` : measured.summary,
  }
}
