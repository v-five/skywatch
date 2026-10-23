// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { type Dir, type Risk, unmeasured } from '../risk'
import type { Segment } from './types'

/** The registry verbs each package tool publishes or yanks with. */
const RELEASE_VERBS: ReadonlyMap<string, readonly string[]> = new Map([
  ['cargo', ['publish', 'yank']],
  ['gem', ['push', 'yank']],
  ['twine', ['upload']],
  ['poetry', ['publish']],
])

export function classifyNodePackage({ program, args }: Segment, dir: Dir): Risk | null {
  if (args.includes('unpublish')) return unmeasured('publish', `${program} unpublish`, 'remove a published package version', dir)
  return args.includes('publish') ? unmeasured('publish', `${program} publish`, 'publish this package to the registry', dir) : null
}

export function classifyRelease({ program, args }: Segment, dir: Dir): Risk | null {
  const [verb = ''] = args
  if (!RELEASE_VERBS.get(program)?.includes(verb)) return null
  return unmeasured('publish', `${program} ${verb}`, `${verb === 'yank' ? 'yank' : 'publish'} a package version`, dir)
}

export function classifyForge({ program, args }: Segment, dir: Dir): Risk | null {
  const [area, action] = args
  if ((area === 'pr' || area === 'mr') && action === 'merge') {
    return unmeasured('publish', `${program} ${area} merge`, `merge a ${area === 'mr' ? 'merge request' : 'pull request'}`, dir)
  }
  if ((area === 'release' || area === 'repo') && action === 'delete') {
    return unmeasured('publish', `${program} ${area} delete`, `delete a ${area === 'repo' ? 'repository' : 'release'}`, dir)
  }
  return null
}
