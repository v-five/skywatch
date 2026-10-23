// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Dir, Risk } from '../risk'
import { joinDir } from '../shell'
import { isFlag, type Segment } from './types'

/** Git's own options come before the subcommand; `-C` moves where it runs. */
function subcommandOf(args: readonly string[], dir: Dir): { sub: string | undefined; rest: string[]; gitDir: Dir } {
  let gitDir = dir
  let i = 0
  while (i < args.length && isFlag(args[i] ?? '')) {
    const hasValue = (args[i] === '-C' || args[i] === '-c') && i + 1 < args.length
    if (args[i] === '-C' && hasValue) gitDir = joinDir(gitDir, args[i + 1])
    i += hasValue ? 2 : 1
  }
  return { sub: args[i], rest: args.slice(i + 1), gitDir }
}

function isForcedDelete(rest: readonly string[]): boolean {
  const isDelete = rest.includes('-d') || rest.includes('--delete')
  return rest.includes('-D') || (isDelete && (rest.includes('-f') || rest.includes('--force')))
}

function isForcedPush(rest: readonly string[]): boolean {
  return rest.some(arg => arg === '--force' || arg === '-f' || arg.startsWith('--force-with-lease') || arg.startsWith('+'))
}

function isStagedOnly(sub: string | undefined, rest: readonly string[]): boolean {
  return sub === 'restore' && rest.includes('--staged') && !rest.includes('--worktree') && !rest.includes('-W')
}

export function classifyGit({ args }: Segment, dir: Dir): Risk | null {
  const { sub, rest, gitDir } = subcommandOf(args, dir)
  if (sub === 'reset' && rest.includes('--hard'))
    return { kind: 'git-reset', group: 'git-history', label: 'git reset --hard', args: rest, dir: gitDir }
  if (sub === 'clean') return { kind: 'git-clean', group: 'delete', label: 'git clean', args: rest, dir: gitDir }
  if (sub === 'branch' && isForcedDelete(rest)) {
    return {
      kind: 'git-branch-delete',
      group: 'git-history',
      label: 'git branch -D',
      branches: rest.filter(arg => !isFlag(arg)),
      dir: gitDir,
    }
  }
  const [stashAction] = rest
  if (sub === 'stash' && (stashAction === 'drop' || stashAction === 'clear')) {
    const ref = rest.slice(1).find(arg => !isFlag(arg)) ?? 'stash@{0}'
    return { kind: 'git-stash', group: 'git-history', label: `git stash ${stashAction}`, which: stashAction, ref, dir: gitDir }
  }
  if (sub === 'push' && isForcedPush(rest))
    return { kind: 'git-push-force', group: 'git-history', label: 'git push --force', args: rest, dir: gitDir }
  if ((sub === 'checkout' || sub === 'restore') && rest.includes('.') && !isStagedOnly(sub, rest)) {
    return { kind: 'git-checkout', group: 'git-history', label: `git ${sub} -- .`, args: rest, dir: gitDir }
  }
  return null
}
