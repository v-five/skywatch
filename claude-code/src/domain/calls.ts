import {
  baseName,
  capitalize,
  isRecord,
  listOf,
  NO_PLACES,
  type Places,
  redact,
  relativePaths,
  shorten,
  shortPath,
  stringOf,
} from '../core'

export const EDIT_TOOLS: ReadonlySet<string> = new Set(['Edit', 'Write', 'NotebookEdit'])
export const SHELL_TOOLS: ReadonlySet<string> = new Set(['Bash', 'PowerShell'])
export const HANDBACK_TOOL = 'SubagentHandback'
export const FILE_TOOLS: ReadonlySet<string> = new Set(['Read', 'Edit', 'Write', 'NotebookEdit', 'Glob', 'Grep'])
/** Tools that only read files: a secret they touch is read, not changed. */
export const READ_TOOLS: ReadonlySet<string> = new Set(['Read', 'Grep'])
export const APP_TOOLS: ReadonlySet<string> = new Set([
  'TodoWrite',
  'TaskCreate',
  'TaskUpdate',
  'TaskList',
  'TaskGet',
  'ToolSearch',
  'AskUserQuestion',
])

export type ServerBlock = { type: string; id?: string; name?: string; tool_use_id?: string }

const QUOTE_MAX = 40
const COMMAND_PHRASE_MAX = 30
const MCP_TOOL = /^mcp__(.+?)__(.+)$/

export function commandOf(input: unknown): string {
  return isRecord(input) ? stringOf(input.command) : ''
}

/** An MCP tool's name as words with its server after it: `mcp__ccd_turn__update_plan` reads `update plan · ccd_turn`. */
export function toolName(tool: string): string {
  const mcp = MCP_TOOL.exec(tool)
  return mcp?.[1] && mcp[2] ? `${mcp[2].replace(/_/g, ' ')} · ${mcp[1]}` : tool
}

/** The first value that is a string, empty or not, as the call reads it; empty when none is. */
function firstString(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === 'string') ?? ''
}

/** One line saying what a call was about: its command, path or pattern; redacted. */
export function describeInput(tool: string, input: unknown, places: Places = NO_PLACES): string {
  const call = isRecord(input) ? input : {}
  const path = typeof call.file_path === 'string' ? shortPath(call.file_path, places) : ''
  const what =
    typeof call.command === 'string' ? relativePaths(call.command, places) : path || firstString(call.pattern, call.url, call.description)
  return redact(what ? `${toolName(tool)} → ${what}` : toolName(tool))
}

const quoted = (value: unknown) => (typeof value === 'string' && value ? ` "${shorten(value, QUOTE_MAX)}"` : '')

/** A plain phrase for what a call does, for when nothing better names it. */
export function phraseOf(tool: string, input: unknown): string {
  const call = isRecord(input) ? input : {}
  if (typeof call.description === 'string' && call.description) return capitalize(call.description)
  const file = typeof call.file_path === 'string' ? baseName(call.file_path) : ''
  switch (tool) {
    case 'Read':
      return `Reading ${file}`
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return `Editing ${file}`
    case 'Write':
      return `Writing ${file}`
    case 'Grep':
      return `Searching for${quoted(call.pattern)}`
    case 'Glob':
      return `Finding files${quoted(call.pattern)}`
    case 'WebFetch':
      return `Fetching ${typeof call.url === 'string' ? call.url.replace(/^https?:\/\//, '').split('/')[0] : 'a page'}`
    case 'WebSearch':
      return `Searching the web${quoted(call.query)}`
    case 'Bash':
    case 'PowerShell':
      return `Running ${typeof call.command === 'string' ? shorten(call.command.trim().split(/\s+/).slice(0, 2).join(' '), COMMAND_PHRASE_MAX) : 'a command'}`
    case 'Skill':
      return `Using the ${stringOf(call.skill)} skill`
    case 'Artifact':
      return 'Publishing an artifact'
  }
  const mcp = MCP_TOOL.exec(tool)
  return mcp?.[2] ? `Calling ${mcp[2].replace(/_/g, ' ')}` : `Using ${tool}`
}

/** The report a background shuttle hands back through the hand-back tool, or null. */
export function handbackMessage(call: unknown): string | null {
  return isRecord(call) && typeof call.message === 'string' ? call.message : null
}

/** The blocks of an assistant row, kept to the fields a server tool's use and result carry. */
export function serverBlocksOf(content: unknown): ServerBlock[] {
  return listOf(content)
    .filter(isRecord)
    .map(block => ({
      type: String(block.type ?? ''),
      ...(typeof block.id === 'string' ? { id: block.id } : {}),
      ...(typeof block.name === 'string' ? { name: block.name } : {}),
      ...(typeof block.tool_use_id === 'string' ? { tool_use_id: block.tool_use_id } : {}),
    }))
}
