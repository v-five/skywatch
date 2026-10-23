import type { Args, On } from 'claude-code'
import { type MockClock, mock } from 'claude-code/testing'
import { HOME_SCRIPT } from '../../src/forcefield'

const NOW = 1_700_000_000_000
const SESSION_ID = 'session-1'
export const CWD = '/work/project'
export const HOME = '/home/captain'

export type RunAnswer = { exitCode: number; stdout: string }
export type UsageAnswer = { percent: number; tokens: number; window: number; usd: number }

export type WorldOptions = {
  now?: number
  /** fs.read answers: absolute paths, or project paths relative to the project; a missing path throws. */
  files?: Readonly<Record<string, string>>
  /** process.run answers by argv; unmatched commands succeed with no output. */
  run?: (argv: readonly string[]) => RunAnswer | undefined
  /** session.usage's reading; null for a host without one. */
  usage?: UsageAnswer | null
  /** Collects every status entry the mod sets, undefined for a clear. */
  statuses?: (string | undefined)[]
}

const DEFAULT_USAGE: UsageAnswer = { percent: 12, tokens: 24_000, window: 200_000, usd: 0.5 }
const RM_COUNT = '3 4096 1\nbuild/a.js\nbuild/b.js\nbuild/c.js'

/** The project's directives file, as a `files` key. */
export const PROJECT_DIRECTIVES = '.claude/skywatch.directives'

/** The force field's scripts: rm finds three files, a folder resolves to itself (`.` to the project, `-` to none), a path sits in the project unless absolute. */
export function shellAnswer(argv: readonly string[]): RunAnswer | undefined {
  const script = argv[2] ?? ''
  if (script.includes('compgen')) return { exitCode: 0, stdout: RM_COUNT }
  if (script.includes('roots=')) {
    const paths = argv.slice(4).map(path => (path.startsWith('/') ? path : `${CWD}/${path}`))
    return { exitCode: 0, stdout: `/tmp\t/private/tmp\t\n${paths.join('\n')}` }
  }
  if (!script.includes('pwd -P')) return undefined
  const dir = argv[4] ?? '.'
  return dir === '-' ? { exitCode: 1, stdout: '' } : { exitCode: 0, stdout: dir === '.' ? CWD : dir }
}

/** A key matches its path exactly; a relative key matches a project path that ends with it, never one under HOME. */
function fileText(files: Readonly<Record<string, string>>, path: string): string {
  const isProjectPath = !path.startsWith(`${HOME}/`)
  const key = Object.keys(files).find(name => path === name || (isProjectPath && !name.startsWith('/') && path.endsWith(`/${name}`)))
  const text = key === undefined ? undefined : files[key]
  if (text === undefined) throw new Error(`ENOENT: ${path}`)
  return text
}

function processAnswer(argv: readonly string[], run: WorldOptions['run']): RunAnswer {
  if (argv[0] === 'bash' && argv[2] === HOME_SCRIPT) return { exitCode: 0, stdout: HOME }
  return run?.(argv) ?? { exitCode: 0, stdout: '' }
}

/** Runs the tool calls the mod lets through: a plain result, or an error for a call `fails` picks. */
export function runTools(on: On, fails: (call: Args<'tool.call'>) => boolean = () => false): void {
  on('tool.call', (_, e) => (fails(e) ? { result: {}, isError: true } : { result: {} }))
}

/** Answers the engine's nouns beneath the mod: clock, store, ui, session, fs and process. */
export function world(on: On, options: WorldOptions = {}): MockClock {
  const clock = mock.clock(on, { now: options.now ?? NOW })
  mock.store(on)
  const usage = options.usage === undefined ? DEFAULT_USAGE : options.usage
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', () => ({ sessionId: SESSION_ID }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', (_, e) => {
    options.statuses?.push(e.text)
    return { value: undefined }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'skywatch' } }))
  on('session.id', () => ({ value: SESSION_ID }))
  on('session.cwd', () => ({ value: CWD }))
  on('session.usage', () => {
    if (!usage) throw new Error('no usage on this host')
    const resetsAt = new Date(NOW + 3_600_000).toISOString()
    return {
      value: {
        startedAt: NOW,
        context: { percent: usage.percent, tokens: usage.tokens, window: usage.window },
        rateLimits: [{ kind: 'five_hour', percentUsed: 30, resetsAt }],
        cost: { usd: usage.usd },
      },
    }
  })
  on('fs.read', (_, e) => ({ value: fileText(options.files ?? {}, e.path) }))
  on('process.run', (_, e) => ({
    value: { stderr: '', isStdoutTruncated: false, isStderrTruncated: false, ...processAnswer(e.argv, options.run) },
  }))
  return clock
}
