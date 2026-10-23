import { classifyDatabaseWords } from './database'
import { classifyFind, classifyRm, classifyXargs } from './delete'
import { classifyGit } from './git'
import { classifyContainers, classifyHelm, classifyKubectl, classifyTerraform } from './infra'
import { classifyForge, classifyNodePackage, classifyRelease } from './publish'
import type { Classifier } from './types'

export { destructiveSql } from './database'
export type { Classifier, Segment } from './types'

/** The classifier for each program a risky segment can start with; a Map, so no inherited name matches. */
export const CLASSIFIERS: ReadonlyMap<string, Classifier> = new Map([
  ['rm', classifyRm],
  ['find', classifyFind],
  ['xargs', classifyXargs],
  ['git', classifyGit],
  ['docker', classifyContainers],
  ['podman', classifyContainers],
  ['docker-compose', classifyContainers],
  ['kubectl', classifyKubectl],
  ['helm', classifyHelm],
  ['terraform', classifyTerraform],
  ['tofu', classifyTerraform],
  ['npm', classifyNodePackage],
  ['yarn', classifyNodePackage],
  ['pnpm', classifyNodePackage],
  ['bun', classifyNodePackage],
  ['cargo', classifyRelease],
  ['gem', classifyRelease],
  ['twine', classifyRelease],
  ['poetry', classifyRelease],
  ['gh', classifyForge],
  ['glab', classifyForge],
])

/** Run on any segment the program's own classifier does not flag. */
export const WORD_RULES: readonly Classifier[] = [classifyDatabaseWords]
