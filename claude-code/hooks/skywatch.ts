import type { Register } from 'claude-code'
import { parseConfig } from '../src/core'
import { registerHooks } from '../src/events'

export const register: Register = (on, options) => registerHooks(on, parseConfig(options))
