import type { EngineInterface } from 'claude-code'
import { DEFAULT_DIRECTIVES, DIRECTIVES_FILE, type DirectiveSet, parseDirectives } from './directives'
import { LOOKUP_TIMEOUT_MS } from './process'

/** Prints the home folder, where the person's directives file lives. */
export const HOME_SCRIPT = 'printf %s "$HOME"'

async function homeFolder($: EngineInterface): Promise<string> {
  return $.process
    .run(['bash', '-c', HOME_SCRIPT], { timeoutMs: LOOKUP_TIMEOUT_MS })
    .then(run => run.stdout.trim())
    .catch(() => '')
}

/** The directives in force: SkyWatch's defaults, then the person's file, then the project's. */
export async function loadDirectives($: EngineInterface): Promise<DirectiveSet> {
  const home = await homeFolder($)
  const files = [
    ...(home ? [{ path: `${home}/${DIRECTIVES_FILE}`, source: `~/${DIRECTIVES_FILE}` }] : []),
    { path: DIRECTIVES_FILE, source: DIRECTIVES_FILE },
  ]
  const set: DirectiveSet = { directives: [...DEFAULT_DIRECTIVES], errors: [] }
  for (const file of files) {
    const text = await $.fs.read(file.path).catch(() => null)
    if (typeof text !== 'string') continue
    const parsed = parseDirectives(text, file.source)
    set.directives.push(...parsed.directives)
    set.errors.push(...parsed.errors)
  }
  return set
}
