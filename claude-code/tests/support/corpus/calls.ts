export const CONFIGS: readonly Record<string, unknown>[] = [
  {},
  { modules: 'shields, bridge, bridge, nope', decks: 'git, shell, other, web, bogus', autoLaunch: false, hazards: 'viewscreen' },
  { modules: '', decks: '', autoLaunch: 'yes', hazards: 'loud' },
  { modules: 'nope', decks: 'other', hazards: 'off' },
  { modules: 42, decks: null },
]

export const TASK_CALLS: readonly { tool: string; input: unknown; plan: string[]; current: string | null }[] = [
  {
    tool: 'TodoWrite',
    input: {
      todos: [
        { content: 'read code', status: 'completed', activeForm: 'Reading code' },
        { content: 'write tests', status: 'in_progress', activeForm: 'writing tests' },
      ],
    },
    plan: [],
    current: null,
  },
  { tool: 'TodoWrite', input: { todos: [{ content: 'a', status: 'pending' }] }, plan: [], current: null },
  { tool: 'TaskUpdate', input: { status: 'in_progress', subject: 'fix bug' }, plan: ['x'], current: null },
  { tool: 'TaskCreate', input: { status: 'in_progress', activeForm: 'Planning' }, plan: [], current: null },
  { tool: 'TaskUpdate', input: { status: 'completed' }, plan: ['x'], current: 'x' },
  { tool: 'TaskUpdate', input: { status: 'pending' }, plan: [], current: null },
  {
    tool: 'mcp__ccd_turn__update_plan',
    input: {
      items: [
        { content: 'one', status: 'completed' },
        { content: 'two', status: 'in_progress' },
      ],
    },
    plan: [],
    current: null,
  },
  { tool: 'mcp__ccd_turn__update_plan', input: { start: 2 }, plan: ['A', 'B', 'C'], current: 'A' },
  { tool: 'mcp__ccd_turn__update_plan', input: { start: 9 }, plan: ['A'], current: 'A' },
  { tool: 'mcp__ccd_turn__update_plan', input: { advance: true }, plan: ['A', 'B'], current: 'A' },
  { tool: 'mcp__ccd_turn__update_plan', input: { advance: true }, plan: ['A', 'B'], current: 'B' },
  { tool: 'mcp__ccd_turn__update_plan', input: { advance: true }, plan: ['A', 'B'], current: null },
  { tool: 'mcp__ccd_turn__update_plan', input: { done: [1] }, plan: ['A'], current: null },
  { tool: 'Read', input: {}, plan: [], current: null },
]

export const TOOL_CALLS: readonly { tool: string; input: unknown }[] = [
  { tool: 'Read', input: { file_path: '/a/b/c/file.ts' } },
  { tool: 'Edit', input: { file_path: 'x\\y\\z.ts' } },
  { tool: 'MultiEdit', input: { file_path: 'm.ts' } },
  { tool: 'Write', input: { file_path: 'w.md' } },
  { tool: 'Grep', input: { pattern: 'needle' } },
  { tool: 'Glob', input: { pattern: '**/*.ts' } },
  { tool: 'Glob', input: {} },
  { tool: 'WebFetch', input: { url: 'https://docs.example.com/a/b' } },
  { tool: 'WebFetch', input: {} },
  { tool: 'WebSearch', input: { query: 'a very long query that goes on and on and on and on' } },
  { tool: 'Bash', input: { command: '  npm   run build --watch' } },
  { tool: 'Bash', input: { command: 'echo token=abc123' } },
  { tool: 'Bash', input: { description: 'list files', command: 'ls' } },
  { tool: 'PowerShell', input: {} },
  { tool: 'Skill', input: { skill: 'review' } },
  { tool: 'Artifact', input: {} },
  { tool: 'Agent', input: { description: 'explore the repo' } },
  { tool: 'mcp__ccd_turn__update_plan', input: {} },
  { tool: 'mcp__Claude_Browser__navigate', input: { url: 'https://x.y' } },
  { tool: 'TodoWrite', input: {} },
  { tool: 'Unknown', input: null },
]

export const PROMPTS: readonly string[] = [
  'fix the bug   in\nthe parser',
  '<task-notification>\n<task-id>x</task-id>',
  '<agent-message from="a18c27cacc721491e">\nhello',
  '<command-name>/review</command-name>',
  '   ',
  'x'.repeat(400),
]

export const HANDBACKS: readonly string[] = [
  '<agent-message from="abc">\n[Subagent hand-back] header\nThe report follows:\n  First real line\n  second',
  '<agent-message from="abc">\n[note]\n<tag>\nBody line here',
  '<agent-message from="abc">\n[only brackets]',
  'not a handback',
]

export const REPORTS: readonly string[] = ['# **Summary**\nrest', '[meta]\n<x>\n> - __Use__ the cache', '', `${'word '.repeat(60)}`]

export const DECK_CALLS: readonly { tool: string; input: unknown }[] = [
  { tool: 'Read', input: {} },
  { tool: 'Bash', input: { command: 'git status' } },
  { tool: 'Bash', input: { command: '  gh pr view' } },
  { tool: 'Bash', input: { command: 'ls' } },
  { tool: 'PowerShell', input: { command: 'git log' } },
  { tool: 'WebFetch', input: {} },
  { tool: 'mcp__claude-in-chrome__navigate', input: {} },
  { tool: 'Agent', input: {} },
  { tool: 'Skill', input: {} },
  { tool: 'TodoWrite', input: {} },
  { tool: 'mcp__ccd_turn__wrap_up', input: {} },
  { tool: 'mcp__github__get_pr', input: {} },
  { tool: 'Weird', input: {} },
]

export const DECK_SETS: readonly string[][] = [
  ['file', 'shell', 'other'],
  ['file', 'git', 'shell', 'web', 'agents', 'app', 'mcp', 'other'],
  ['mcp', 'other'],
  ['other'],
]
