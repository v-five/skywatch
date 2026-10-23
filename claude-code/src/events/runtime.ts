import type { RenderSurface } from 'claude-code'
import type { Config } from '../core'
import { type ActiveHold, DEFAULT_DIRECTIVES, type DirectiveSet, type Held, isActiveHold } from '../forcefield'

/** What one load of the mod keeps in memory: none of it is state the pane must find after a reload. */
export type Runtime = {
  readonly config: Config
  /** session.start's surface; on the terminal the beacon goes on the prompt hint line. */
  surface: RenderSurface | null
  directives: DirectiveSet
  /** The permission mode the footer last showed: the built-in guard keeps classic hooks from installed mods. */
  modeSeen: string | null
  /** Measured risky calls by tool_use_id, until they settle. */
  readonly held: Map<string, Held>
}

export function createRuntime(config: Config): Runtime {
  return {
    config,
    surface: null,
    directives: { directives: [...DEFAULT_DIRECTIVES], errors: [] },
    modeSeen: null,
    held: new Map(),
  }
}

/** The held call whose prompt is up, the oldest first. */
export function heldNow(runtime: Runtime): ActiveHold | null {
  return [...runtime.held.values()].find(isActiveHold) ?? null
}

export function hasBlockDirective(runtime: Runtime): boolean {
  return runtime.directives.directives.some(directive => directive.mode === 'block')
}
