// Ported from Anthropic's blast-radius sample mod (claude-code-playground, 569c528).
// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { EngineInterface } from 'claude-code'
import { fmtBytes, plural } from '../../core'
import { MEASURE_TIMEOUT_MS, nonEmptyLines, SCRIPT_NAME } from '../process'
import type { Measure, RiskOf } from '../risk'
import { LIST_MAX, listMeasure, plainMeasure } from './result'

// Paths reach bash as arguments, never as source; compgen -G expands a glob without command substitution.
const RM_SCRIPT = `
shopt -s nullglob dotglob
paths=()
for p in "$@"; do
  case "$p" in "~"|"~/"*) p="$HOME\${p#\\~}";; esac
  if [[ "$p" == *[*?[]* ]]; then
    while IFS= read -r m; do paths+=("$m"); done < <(compgen -G "$p")
  elif [[ -e "$p" || -L "$p" ]]; then
    paths+=("$p")
  fi
done
if (( \${#paths[@]} == 0 )); then echo "0 0 0"; exit 0; fi
for i in "\${!paths[@]}"; do case "\${paths[$i]}" in /*) ;; *) paths[$i]="./\${paths[$i]}";; esac; done
files=$(find "\${paths[@]}" \\( -type f -o -type l \\) 2>/dev/null | wc -l | tr -d ' ')
kb=$(du -skc "\${paths[@]}" 2>/dev/null | tail -n1 | cut -f1)
echo "$files $(( \${kb:-0} * 1024 )) \${#paths[@]}"
find "\${paths[@]}" \\( -type f -o -type l \\) 2>/dev/null | head -n ${LIST_MAX}
`

/** find actions besides listing: a dry run without -delete must not run them. */
const FIND_ACTIONS: ReadonlySet<string> = new Set(['-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'])

/** The rm script's output: files, bytes and paths found, then up to LIST_MAX file names. */
export function readRmOutput(stdout: string): { files: number; bytes: number; found: number; names: string[] } {
  const [head, ...names] = nonEmptyLines(stdout)
  const [files = 0, bytes = 0, found = 0] = (head ?? '0 0 0').split(' ').map(Number)
  return { files, bytes, found, names: names.map(name => name.replace(/^\.\//, '')) }
}

export async function measureRm($: EngineInterface, risk: RiskOf<'rm'>, cwd: string): Promise<Measure> {
  if (risk.targets.length === 0) return plainMeasure('rm with no paths', 'No paths to expand.')
  const run = await $.process.run(['bash', '-c', RM_SCRIPT, SCRIPT_NAME, ...risk.targets], { cwd, timeoutMs: MEASURE_TIMEOUT_MS })
  const { files, bytes, found, names } = readRmOutput(run.stdout)
  const paths = risk.targets.join(' ')
  if (!found) return plainMeasure(`delete nothing: no file matches ${paths}`, "The paths don't exist, so rm has nothing to remove.")
  if (!files) return plainMeasure(`delete ${plural(found, 'path')} with no files in ${found === 1 ? 'it' : 'them'}`, `Paths: ${paths}`)
  return {
    summary: `delete ${plural(files, 'file')} (about ${fmtBytes(bytes)})`,
    lines: names,
    more: Math.max(0, files - names.length),
    note: `Paths: ${paths}`,
  }
}

export async function measureFind($: EngineInterface, risk: RiskOf<'find-delete'>, cwd: string): Promise<Measure> {
  if (risk.args.some(arg => FIND_ACTIONS.has(arg))) {
    return plainMeasure('delete what find matches', "It also runs other actions, so it isn't dry-run here.")
  }
  const args = risk.args.filter(arg => arg !== '-delete')
  const run = await $.process.run(['find', ...args, '-print'], { cwd, timeoutMs: MEASURE_TIMEOUT_MS })
  const hits = nonEmptyLines(run.stdout)
  const summary = hits.length === 0 ? 'delete nothing: find matches nothing' : `delete ${plural(hits.length, 'path')} find matches`
  return listMeasure(summary, hits, 'From the same find without -delete.')
}
