// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { EngineInterface } from 'claude-code'
import { plural } from '../../core'
import { MEASURE_TIMEOUT_MS, nonEmptyLines } from '../process'
import type { Measure, RiskOf } from '../risk'
import { GIT } from './git'
import { LIST_MAX, listMeasure, plainMeasure } from './result'

const STASH_NOTE = 'A dropped stash is hard to get back.'

/** Commits only this branch has, on no other branch or remote; null when the branch does not exist. */
async function uniqueCommits($: EngineInterface, branch: string, cwd: string): Promise<number | null> {
  const run = await $.process.run(
    [...GIT, 'rev-list', '--count', branch, '--not', `--exclude=refs/heads/${branch}`, '--branches', '--remotes'],
    {
      cwd,
      timeoutMs: MEASURE_TIMEOUT_MS,
    },
  )
  return run.exitCode === 0 ? Number(run.stdout.trim()) || 0 : null
}

export async function measureBranchDelete($: EngineInterface, risk: RiskOf<'git-branch-delete'>, cwd: string): Promise<Measure> {
  if (risk.branches.length === 0) return plainMeasure('git branch -D with no branch')
  const lines: string[] = []
  let unique = 0
  let found = 0
  for (const branch of risk.branches.slice(0, LIST_MAX)) {
    const count = await uniqueCommits($, branch, cwd)
    if (count === null) {
      lines.push(`${branch}: not found`)
      continue
    }
    found += 1
    unique += count
    lines.push(count === 0 ? `${branch}: every commit is on another branch` : `${branch}: ${plural(count, 'commit')} on no other branch`)
  }
  const names = risk.branches.join(', ')
  if (found === 0) return plainMeasure(`delete ${names}, which ${risk.branches.length === 1 ? "doesn't" : "don't"} exist`)
  return {
    summary:
      unique === 0
        ? `delete ${names} (nothing only there)`
        : `delete ${names}, losing ${plural(unique, 'commit')} that are on no other branch`,
    lines,
    more: 0,
    note: unique > 0 ? 'Those commits stay in the reflog for a while, then git collects them.' : '',
  }
}

export async function measureStash($: EngineInterface, risk: RiskOf<'git-stash'>, cwd: string): Promise<Measure> {
  const run = await $.process.run([...GIT, 'stash', 'list'], { cwd, timeoutMs: MEASURE_TIMEOUT_MS })
  const all = nonEmptyLines(run.stdout)
  if (all.length === 0) return plainMeasure(`${risk.label}: there are no stashes`)
  if (risk.which === 'clear') return listMeasure(`drop all ${plural(all.length, 'stash', 'stashes')}`, all, STASH_NOTE)
  const ref = /^\d+$/.test(risk.ref) ? `stash@{${risk.ref}}` : risk.ref
  const hit = all.find(line => line.startsWith(`${ref}:`))
  return hit ? plainMeasure(`drop ${hit}`, STASH_NOTE) : plainMeasure(`drop ${ref}, which doesn't exist`)
}
