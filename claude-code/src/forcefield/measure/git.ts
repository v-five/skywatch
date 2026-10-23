// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { EngineInterface } from 'claude-code'
import { plural } from '../../core'
import { ERROR_MAX, MEASURE_TIMEOUT_MS, nonEmptyLines, REF_TIMEOUT_MS } from '../process'
import type { Measure, RiskOf } from '../risk'
import { listMeasure, plainMeasure } from './result'

const WOULD_REMOVE = 'Would remove '

// A repository's own config can run programs (hooks, fsmonitor, pager, gpg): off, and the plumbing compares by stat.
const GIT_CONFIG = [
  'core.fsmonitor=false',
  'core.hooksPath=/dev/null',
  'core.pager=cat',
  'diff.external=',
  'core.untrackedCache=false',
  'log.showSignature=false',
  'gpg.program=false',
  'core.attributesFile=/dev/null',
] as const
export const GIT: readonly string[] = ['git', ...GIT_CONFIG.flatMap(setting => ['-c', setting])]

/** `git clean` arguments for a dry run: excludes and paths kept, -f, -i and -q dropped (they change the dry run). */
export function cleanArgs(args: readonly string[]): { flags: string[]; paths: string[] } {
  const flags: string[] = []
  const paths: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? ''
    if (arg === '--') {
      paths.push(...args.slice(i + 1))
      break
    }
    if (arg === '-e' || arg === '--exclude') {
      flags.push(arg, args[i + 1] ?? '')
      i += 1
    } else if (arg.startsWith('--exclude=') || /^-e./.test(arg)) {
      flags.push(arg)
    } else if (/^-[a-zA-Z]+$/.test(arg)) {
      const kept = arg.replace(/[finq]/g, '')
      if (kept !== '-') flags.push(kept)
    } else if (!arg.startsWith('-')) {
      paths.push(arg)
    }
  }
  return { flags, paths }
}

export async function measureClean($: EngineInterface, risk: RiskOf<'git-clean'>, cwd: string): Promise<Measure> {
  const { flags, paths } = cleanArgs(risk.args)
  const run = await $.process.run([...GIT, 'clean', '-n', ...flags, '--', ...paths], { cwd, timeoutMs: MEASURE_TIMEOUT_MS })
  if (run.exitCode !== 0) return plainMeasure('git clean (could not dry-run it)', run.stderr.trim().slice(0, ERROR_MAX))
  const gone = nonEmptyLines(run.stdout)
    .filter(line => line.startsWith(WOULD_REMOVE))
    .map(line => line.slice(WOULD_REMOVE.length))
  const summary = gone.length === 0 ? 'remove nothing: no untracked files match' : `remove ${plural(gone.length, 'untracked path')}`
  return listMeasure(summary, gone, "From git clean -n. Untracked files are not in git, so they can't be recovered.")
}

/** `--name-status` rows as `M path`. */
export function diffRows(stdout: string): string[] {
  return nonEmptyLines(stdout).map(line => line.replace(/\t/, ' '))
}

/** reset --hard drops staged and unstaged changes; checkout -- . drops unstaged ones. Both read by stat only. */
export async function measureDiscard($: EngineInterface, risk: RiskOf<'git-reset' | 'git-checkout'>, cwd: string): Promise<Measure> {
  const unstaged = await $.process.run([...GIT, 'diff-files', '--name-status', '--no-renames'], { cwd, timeoutMs: MEASURE_TIMEOUT_MS })
  if (unstaged.exitCode !== 0) return plainMeasure(`${risk.label} (not a git repo here?)`, unstaged.stderr.trim().slice(0, ERROR_MAX))
  const staged =
    risk.kind === 'git-reset'
      ? await $.process.run([...GIT, 'diff-index', '--cached', '--name-status', '--no-renames', 'HEAD'], {
          cwd,
          timeoutMs: MEASURE_TIMEOUT_MS,
        })
      : null
  const lost = [...new Set([...diffRows(unstaged.stdout), ...(staged ? diffRows(staged.stdout) : [])])]
  const summary =
    lost.length === 0 ? 'discard nothing: no uncommitted changes' : `discard uncommitted changes in ${plural(lost.length, 'file')}`
  return listMeasure(summary, lost, lost.length > 0 ? "Uncommitted changes can't be recovered." : '')
}

/** The remote, the local source and the remote branch a push names; a refspec without a colon pushes its namesake. */
export function pushTarget(args: readonly string[]): { remote: string; source: string; branch: string } {
  const positional = args.filter(arg => !arg.startsWith('-'))
  const spec = (positional[1] ?? '').replace(/^\+/, '')
  const [source = '', branch = ''] = spec.includes(':') ? spec.split(':') : [spec, spec]
  return { remote: positional[0] ?? 'origin', source, branch: branch.replace(/^refs\/heads\//, '') }
}

async function currentBranch($: EngineInterface, cwd: string): Promise<string> {
  const head = await $.process.run([...GIT, 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd, timeoutMs: REF_TIMEOUT_MS })
  return head.stdout.trim()
}

export async function measurePush($: EngineInterface, risk: RiskOf<'git-push-force'>, cwd: string): Promise<Measure> {
  const target = pushTarget(risk.args)
  const isCurrent = !target.branch || target.branch === 'HEAD'
  const branch = isCurrent ? await currentBranch($, cwd) : target.branch
  const source = isCurrent ? 'HEAD' : target.source || 'HEAD'
  if ([source, branch, target.remote].some(part => part.startsWith('-'))) {
    return plainMeasure('force-push', "The refspec reads as an option, so it isn't measured.")
  }
  const ref = `${target.remote}/${branch}`
  const known = await $.process.run([...GIT, 'rev-parse', '--verify', '--quiet', '--end-of-options', ref], {
    cwd,
    timeoutMs: REF_TIMEOUT_MS,
  })
  if (known.exitCode !== 0) {
    return plainMeasure(
      `force-push to ${ref}`,
      `No local copy of ${ref}, so I can't tell which commits the push would drop. Run git fetch first.`,
    )
  }
  const log = await $.process.run([...GIT, 'log', '--oneline', '--no-decorate', '--end-of-options', `${source}..${ref}`], {
    cwd,
    timeoutMs: MEASURE_TIMEOUT_MS,
  })
  const dropped = nonEmptyLines(log.stdout)
  const summary = `force-push to ${ref}: drops ${dropped.length === 0 ? 'no commits' : plural(dropped.length, 'commit')}`
  return listMeasure(summary, dropped, `Commits on ${ref} that ${source} doesn't have, as of the last fetch.`)
}
