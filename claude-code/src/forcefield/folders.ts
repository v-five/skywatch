// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { EngineInterface } from 'claude-code'
import { LOOKUP_TIMEOUT_MS, SCRIPT_NAME } from './process'
import type { Risk, RiskOf } from './risk'

/** Characters the shell leaves alone, so a path is read as rm will see it. */
const PLAIN_PATH = /^[A-Za-z0-9._/+@%,:-]+$/

// Paths reach bash as arguments, never as source, so nothing in them runs.
const CD_SCRIPT = `unset CDPATH; d="$1"; case "$d" in "~") d="$HOME";; "~/"*) d="$HOME/\${d#\\~/}";; esac; cd -- "$d" 2>/dev/null && pwd -P`

/** Prints the temp roots on one tab-separated line, then each path's physical location, or an empty line. */
const REAL_PATHS_SCRIPT = `unset CDPATH
real() { local p="$1"; if [ -d "$p" ]; then (cd -- "$p" 2>/dev/null && pwd -P); else local d; d=$(dirname -- "$p"); local b; b=$(basename -- "$p"); case "$b" in .|..) echo;; *) (cd -- "$d" 2>/dev/null && printf '%s/%s\\n' "$(pwd -P)" "$b") || echo;; esac; fi; }
roots=""; for r in /tmp /private/tmp "\${TMPDIR:-}"; do [ -n "$r" ] && roots="$roots$(real "\${r%/}")\t"; done
printf '%s\\n' "$roots"
for p in "$@"; do real "$p"; done`

/** A `cd` target as an absolute folder, or null when it does not exist or depends on the shell's history. */
export async function resolveDir($: EngineInterface, sessionCwd: string, dir: string): Promise<string | null> {
  if (dir === '-') return null
  const run = await $.process.run(['bash', '-c', CD_SCRIPT, SCRIPT_NAME, dir], { cwd: sessionCwd, timeoutMs: LOOKUP_TIMEOUT_MS })
  const out = run.stdout.trim()
  return run.exitCode === 0 && out !== '' ? out : null
}

/** True when every path is strictly inside one of the roots, never a root itself. */
export function allUnder(roots: readonly string[], paths: readonly string[]): boolean {
  const kept = roots.filter(root => root !== '' && root !== '/')
  return paths.length > 0 && paths.every(path => path !== '' && kept.some(root => path !== root && path.startsWith(`${root}/`)))
}

const isRm = (risk: Risk): risk is RiskOf<'rm'> => risk.kind === 'rm'

/** True when every rm in the command removes only things inside /tmp, /private/tmp or $TMPDIR. */
export async function isTempOnly($: EngineInterface, risks: readonly Risk[], sessionCwd: string): Promise<boolean> {
  const rms = risks.filter(isRm)
  if (rms.length === 0 || rms.length !== risks.length || rms.some(risk => risk.targets.length === 0)) return false
  if (rms.some(risk => risk.targets.some(target => !PLAIN_PATH.test(target)))) return false
  for (const risk of rms) {
    const cwd = risk.dir ? await resolveDir($, sessionCwd, risk.dir) : sessionCwd
    if (cwd === null) return false
    const run = await $.process.run(['bash', '-c', REAL_PATHS_SCRIPT, SCRIPT_NAME, ...risk.targets], { cwd, timeoutMs: LOOKUP_TIMEOUT_MS })
    if (run.exitCode !== 0) return false
    const [rootLine = '', ...paths] = run.stdout.split('\n')
    if (!allUnder(rootLine.split('\t'), paths.slice(0, risk.targets.length))) return false
  }
  return true
}
