// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { type Dir, type Risk, unmeasured } from '../risk'
import { isFlag, type Segment } from './types'

const PRUNABLE = ['system', 'volume', 'image', 'container', 'network', 'builder', 'buildx']
const KUBECTL_TARGET_WORDS = 2

function pruneSummary(sub: string): string {
  if (sub === 'volume') return 'delete volumes and the data in them'
  return `remove ${sub === 'system' ? 'unused containers, networks, images and caches' : `${sub}s`}`
}

export function classifyContainers({ program, args }: Segment, dir: Dir): Risk | null {
  const [sub = '', ...more] = program === 'docker-compose' ? ['compose', ...args] : args
  if (sub === 'rm' || sub === 'rmi')
    return unmeasured('infra', `${program} ${sub}`, sub === 'rm' ? 'delete containers' : 'delete images', dir)
  if (PRUNABLE.includes(sub) && (more.includes('prune') || more.includes('rm'))) {
    return unmeasured('infra', `${program} ${sub} ${more.includes('prune') ? 'prune' : 'rm'}`, pruneSummary(sub), dir)
  }
  if (sub === 'compose' && more.includes('down') && (more.includes('-v') || more.includes('--volumes'))) {
    return unmeasured('infra', 'compose down -v', 'stop the stack and delete its volumes, with their data', dir)
  }
  return null
}

export function classifyKubectl({ args }: Segment, dir: Dir): Risk | null {
  if (!args.includes('delete')) return null
  const what = args
    .slice(args.indexOf('delete') + 1)
    .filter(arg => !isFlag(arg))
    .slice(0, KUBECTL_TARGET_WORDS)
    .join(' ')
  return unmeasured('infra', 'kubectl delete', `delete Kubernetes resources${what ? `: ${what}` : ''}`, dir)
}

export function classifyHelm({ args }: Segment, dir: Dir): Risk | null {
  return args.includes('uninstall') || args.includes('delete')
    ? unmeasured('infra', 'helm uninstall', 'uninstall a Helm release', dir)
    : null
}

export function classifyTerraform({ program, args }: Segment, dir: Dir): Risk | null {
  if (!args.includes('destroy') && !(args.includes('apply') && args.includes('-destroy'))) return null
  return unmeasured('infra', `${program} destroy`, 'destroy the infrastructure this configuration manages', dir)
}
