import type { Ballast, Layer, Usage } from '../../types'
import { isRecord, stringOf } from '../core'

/** The breakdown's rows SkyWatch reads; deferred tool schemas sit outside the window and are left out. */
export type BreakdownReading = {
  categories: readonly { name: string; tokens: number; color: string; kind: string }[]
  autoCompactThreshold?: number
  isAutoCompactEnabled: boolean
  mcpTools: readonly { serverName: string; tokens: number; isLoaded: boolean }[]
  agents: readonly { agentType: string; tokens: number }[]
  skills?: { skillFrontmatter: readonly { name: string; tokens: number }[] }
}

/** The ship's words for Claude Code's context rows; a row not listed keeps its own name. */
const LAYER_NAMES: ReadonlyMap<string, string> = new Map([
  ['Messages', 'Cargo'],
  ['MCP tools', 'Docking ports'],
  ['System tools', 'Ship systems'],
  ['System prompt', 'Core'],
  ['Skills', 'Training'],
  ['Memory files', 'Archives'],
  ['Custom agents', 'Crew'],
  ['MCP server instructions', 'Port manuals'],
  ['Autocompact buffer', 'Reserve'],
  ['Free space', 'Open space'],
])
const LAYER_KINDS: ReadonlySet<string> = new Set(['used', 'free', 'buffer'])
/** Less than this many tokens is not worth naming as ballast. */
const BALLAST_MIN = 500
const BALLAST_MAX = 5
const MCP_TOOL = /^mcp__(.+?)__/

export function layerName(name: string): string {
  return LAYER_NAMES.get(name) ?? name
}

function isLayerKind(kind: string): kind is Layer['kind'] {
  return LAYER_KINDS.has(kind)
}

/** The context's layers, largest first within each kind: what is used, then the reserve, then open space. */
export function layersOf(breakdown: BreakdownReading): Layer[] {
  return breakdown.categories.flatMap(({ name, tokens, kind, color }) =>
    isLayerKind(kind) && tokens > 0 ? [{ name, tokens, kind, color }] : [],
  )
}

/** How a call counts as using something the context carries: an MCP server, a skill or an agent type. */
export function usedKeyOf(tool: string, input: unknown): string | null {
  const server = MCP_TOOL.exec(tool)?.[1]
  if (server) return `mcp:${server}`
  const call = isRecord(input) ? input : {}
  if (tool === 'Skill') return stringOf(call.skill) ? `skill:${stringOf(call.skill)}` : null
  return null
}

export function withUsed(usage: Usage, key: string): Usage {
  const used = usage.used ?? []
  return used.includes(key) ? usage : { ...usage, used: [...used, key] }
}

/** What the context carries and this session has not used: MCP servers, skills and agents, heaviest first. */
export function ballastOf(breakdown: BreakdownReading, used: readonly string[]): Ballast[] {
  const servers = new Map<string, number>()
  for (const tool of breakdown.mcpTools) {
    if (tool.isLoaded) servers.set(tool.serverName, (servers.get(tool.serverName) ?? 0) + tool.tokens)
  }
  const items: Ballast[] = [
    ...[...servers].map(([name, tokens]) => ({ key: `mcp:${name}`, name, tokens })),
    ...(breakdown.skills?.skillFrontmatter ?? []).map(skill => ({ key: `skill:${skill.name}`, name: skill.name, tokens: skill.tokens })),
    ...breakdown.agents.map(agent => ({ key: `agent:${agent.agentType}`, name: agent.agentType, tokens: agent.tokens })),
  ]
  return items
    .filter(item => item.tokens >= BALLAST_MIN && !used.includes(item.key))
    .sort((left, right) => right.tokens - left.tokens)
    .slice(0, BALLAST_MAX)
}

/** The usage with a breakdown read in: its layers, where auto-compaction runs, and its ballast. */
export function withManifest(usage: Usage, breakdown: BreakdownReading): Usage {
  return {
    ...usage,
    layers: layersOf(breakdown),
    compactAt: breakdown.isAutoCompactEnabled ? (breakdown.autoCompactThreshold ?? null) : null,
    ballast: ballastOf(breakdown, usage.used ?? []),
  }
}
