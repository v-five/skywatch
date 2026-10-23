import type { On } from 'claude-code'
import type { Config } from '../core'
import { registerAgents } from './agents'
import { registerCommands } from './commands'
import { registerJumps } from './jumps'
import { registerRender } from './render'
import { createRuntime } from './runtime'
import { registerSession } from './session'
import { registerTools } from './tools'

export function registerHooks(on: On, config: Config): void {
  const runtime = createRuntime(config)
  registerSession(on, runtime)
  registerCommands(on, runtime)
  registerAgents(on, runtime)
  registerJumps(on, runtime)
  registerTools(on, runtime)
  registerRender(on, runtime)
}
