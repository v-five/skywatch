// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { type Dir, type Risk, unmeasured } from '../risk'
import { isFlag, type Segment } from './types'

const IS_RM = /(^|\/)rm$/
const FIND_EXEC = ['-exec', '-execdir', '-ok', '-okdir']

const isShortFlag = (flag: string) => /^-[^-]/.test(flag)

export function classifyRm({ args }: Segment, dir: Dir): Risk | null {
  const flags = args.filter(isFlag)
  const isRecursive = flags.some(flag => flag === '--recursive' || (isShortFlag(flag) && /[rR]/.test(flag)))
  const isForced = flags.some(flag => flag === '--force' || (isShortFlag(flag) && flag.includes('f')))
  if (!isRecursive && !isForced) return null
  const targets = args.filter(arg => !isFlag(arg) || arg === '-')
  return { kind: 'rm', group: 'delete', label: `rm ${flags.join(' ')}`.trim(), targets, dir }
}

export function classifyFind({ args }: Segment, dir: Dir): Risk | null {
  if (args.includes('-delete')) return { kind: 'find-delete', group: 'delete', label: 'find -delete', args: [...args], dir }
  const exec = args.findIndex(arg => FIND_EXEC.includes(arg))
  if (exec === -1 || !IS_RM.test(args[exec + 1] ?? '')) return null
  return unmeasured(
    'delete',
    'find -exec rm',
    'delete every file find matches',
    dir,
    "find runs rm on each match, so it can't be dry-run safely here.",
  )
}

export function classifyXargs({ args }: Segment, dir: Dir): Risk | null {
  if (!args.some(arg => IS_RM.test(arg))) return null
  return unmeasured(
    'delete',
    'xargs rm',
    'delete files named on its input',
    dir,
    "The paths come from the input, so they can't be measured before it runs.",
  )
}
