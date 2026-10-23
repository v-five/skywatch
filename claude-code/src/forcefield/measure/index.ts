import type { EngineInterface } from 'claude-code'
import { isRecord } from '../../core'
import { ERROR_MAX } from '../process'
import type { Measure, Risk } from '../risk'
import { measureClean, measureDiscard, measurePush } from './git'
import { measureFind, measureRm } from './paths'
import { measureBranchDelete, measureStash } from './refs'
import { plainMeasure } from './result'

export { cleanArgs, diffRows, pushTarget } from './git'
export { readRmOutput } from './paths'
export { plainMeasure } from './result'

async function measureKind($: EngineInterface, risk: Risk, cwd: string): Promise<Measure> {
  switch (risk.kind) {
    case 'rm':
      return measureRm($, risk, cwd)
    case 'find-delete':
      return measureFind($, risk, cwd)
    case 'git-clean':
      return measureClean($, risk, cwd)
    case 'git-push-force':
      return measurePush($, risk, cwd)
    case 'git-branch-delete':
      return measureBranchDelete($, risk, cwd)
    case 'git-stash':
      return measureStash($, risk, cwd)
    case 'git-reset':
    case 'git-checkout':
      return measureDiscard($, risk, cwd)
    case 'migrate':
      // Listing pending migrations runs the project's own code before the person answers.
      return plainMeasure(`run ${risk.label}`, "Not measured: listing pending migrations would run the project's code first.")
    case 'unmeasured':
      return plainMeasure(risk.summary, risk.note)
  }
}

/** What a risky command would change. Never throws: a failed read is said, not hidden. */
export async function measure($: EngineInterface, risk: Risk, cwd: string): Promise<Measure> {
  try {
    return await measureKind($, risk, cwd)
  } catch (error) {
    const reason = isRecord(error) && typeof error.message === 'string' ? error.message : String(error)
    return plainMeasure(`${risk.label} (could not measure it)`, `Could not measure: ${reason.slice(0, ERROR_MAX)}`)
  }
}
