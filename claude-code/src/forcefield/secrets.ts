import { baseName, isRecord } from '../core'
import { commandOf, SHELL_TOOLS } from '../domain'

const ENV_NAME = /^\.env(?:\.[\w-]+)?$/
const ENV_TEMPLATE = /^\.env\.(?:example|sample|template|dist|defaults)$/
const ENV_IN_COMMAND = /(?:^|[\s'"=<>(])((?:[^\s'"=<>()]*\/)?\.env(?:\.[\w-]+)?)(?=$|[\s'";|&)>])/g

/** A dotenv file may hold secrets; templates are meant to be shared. */
function isSecretFile(path: string): boolean {
  const name = baseName(path)
  return ENV_NAME.test(name) && !ENV_TEMPLATE.test(name)
}

/** The dotenv file a call reads or changes, or null. */
export function secretFileOf(tool: string, input: unknown): string | null {
  if (SHELL_TOOLS.has(tool)) {
    for (const match of commandOf(input).matchAll(ENV_IN_COMMAND)) if (match[1] && isSecretFile(match[1])) return match[1]
    return null
  }
  const call = isRecord(input) ? input : {}
  const path = [call.file_path, call.notebook_path, call.path].find((value): value is string => typeof value === 'string' && value !== '')
  return path && isSecretFile(path) ? path : null
}
