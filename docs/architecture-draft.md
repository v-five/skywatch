> **Superseded by [architecture.md](architecture.md).** Kept as a record of the design made from the brief alone; several of its choices cannot load in the mod engine. Do not follow it.

# SkyWatch architecture (draft)

Target structure for the full refactor described in [brief.md](brief.md). Behaviour, stored data and `claude plugin validate` output (hooks, `$` calls, state keys) stay the same; only file paths change. Words follow the [glossary](glossary.md); rules follow [conventions.md](conventions.md).

## 1. File tree

All mod source stays under `claude-code/hooks/` because the engine loads the hooks module and its static imports from there. File names are kebab-case; components inside them are PascalCase. Every file targets under 300 lines.

```
claude-code/
  .claude-plugin/plugin.json          # manifest and userConfig schema (modules, decks, autoLaunch, hazards); unchanged
  .claude-plugin/types/               # engine-generated API types, git-ignored; never edited
  types/index.d.ts                    # $.state contract: PluginState.skywatch keys and shapes; no imports
  AGENTS.md                           # mod runtime rules for agents
  CLAUDE.md                           # points to AGENTS.md
  LICENSE
  hooks/
    hooks.json                        # names the single hooks module: skywatch.ts
    skywatch.ts                       # register(on, options): parse config, create scratch, call registerHooks

    core/                             # generic pure helpers; imports nothing outside core/
      index.ts                        # barrel
      limits.ts                       # shared numeric limits (page size, list caps, truncation widths, timeouts, flush interval)
      guards.ts                       # type guards and safe readers for unknown input (isRecord, readString, readNumber)
      text.ts                         # capitalize, plural, truncate, pad by measured width
      format.ts                       # tokens, durations, clock time, cost, percent, tok/s
      tally.ts                        # sum and merge count records, count by key
      list.ts                         # updateById, prepend with cap, newest-first helpers
      content.ts                      # extract plain text from message content blocks
      redact.ts                       # mask credentials in free text
      shell/
        index.ts                      # barrel
        tokenize.ts                   # quote-, escape- and heredoc-aware tokenizer for one shell line
        segments.ts                   # split a line into command segments (&&, ||, ;, |, subshells, heredoc bodies)
        scope.ts                      # track working directory across cd, pushd, popd and git -C

    calls/                            # tool-call naming and summaries
      index.ts                        # barrel
      names.ts                        # ToolName parsing, MCP server/tool split, display name
      summary.ts                      # SUMMARIZERS table: tool input to one-line summary (redacted by caller)

    hazard/                           # context-fill scale
      index.ts                        # barrel
      scale.ts                        # HAZARD_STEPS (8 steps, thresholds, labels), hazardFor(fill)
      mode.ts                         # HazardMode union, parse, effectiveMode(view, config)

    forcefield/                       # risky-command classification, directives, measures
      index.ts                        # barrel: classifyCommand, ruleOn, planMeasure, parseDirectives, Risk types
      risk.ts                         # RISK_GROUPS const array, RiskGroup and Risk union, riskLabel
      classify.ts                     # classifyCommand: segments + scope, dispatch via classifier table, collect Risks
      classifiers.ts                  # PROGRAM_CLASSIFIERS table and ANY_PROGRAM_CHECKS list
      temp-paths.ts                   # TEMP_ROOTS, isInsideTemp(path, cwd)
      rules/
        index.ts                      # barrel
        rm.ts                         # rm -r/-f outside temp folders
        find.ts                       # find -delete, find -exec rm
        git.ts                        # reset --hard, clean, push --force, branch -D, stash drop/clear
        containers.ts                 # docker, kubectl, helm deletes and prunes
        terraform.ts                  # terraform destroy, apply -destroy, state rm
        release.ts                    # package publish (npm, pnpm, yarn, cargo, gem, twine) and gh pr merge
        migrations.ts                 # database migration commands
        sql.ts                        # destructive SQL passed to database clients
        secrets.ts                    # reads of dotenv secret files by any program
      directives/
        index.ts                      # barrel
        parse.ts                      # directive file text to Directive[] (pass|hold|block, @group or glob)
        match.ts                      # last-match-wins over defaults, user then project file
        defaults.ts                   # built-in action per RiskGroup
      measure/
        index.ts                      # barrel: planMeasure
        plan.ts                       # MEASURE_PLANNERS table keyed by RiskGroup
        paths.ts                      # rm/find measure: count files and bytes with read-only find/bash
        git.ts                        # git measure: plumbing commands that would be lost or rewritten
        git-env.ts                    # env and flags disabling hooks, pagers, filters, fsmonitor
        describe.ts                   # groups with no dry run: describe the command target
      ruling.ts                       # ruleOn(risks, command, directives): pass | hold | block

    shields/                          # permission checks and verdicts
      index.ts                        # barrel
      types.ts                        # aliases to the shields slice of the state contract
      verdicts.ts                     # VERDICTS const array, Verdict union, VERDICT_LABEL table
      decks.ts                        # DECKS const array, Deck union, deckFor(tool, decks), hotkeys
      reducers.ts                     # recordCheck, holdCall, releaseHeld, forcefield counts
      normalize.ts                    # unknown to shields slice

    fleet/                            # shuttles and probes
      index.ts                        # barrel
      types.ts                        # aliases to shuttles and probes slices
      shuttles.ts                     # launchShuttle, stepShuttle, recordShuttleTool, finishShuttle, dock
      probes.ts                       # openProbe, closeProbe, unclaimed-loop detection
      attribution.ts                  # map a model loop or tool call to its shuttle or probe
      normalize.ts                    # unknown to shuttles and probes slices

    council/                          # advisor/architect transmissions
      index.ts                        # barrel
      types.ts                        # aliases to council and councilRoster slices
      roster.ts                       # which agents and server tools count as council
      moments.ts                      # MOMENT_RULES table: before a plan, error repeats, before done
      reducers.ts                     # recordTransmission, recordAdvice
      normalize.ts                    # unknown to council and councilRoster slices

    mission/                          # usage, jumps, session totals
      index.ts                        # barrel
      types.ts                        # aliases to usage, jump, lastJump, totals slices
      usage.ts                        # add one request's usage: hull, tokens, cost, request count, speed
      jump.ts                         # startJump, completeJump, delta, duration, tok/s, lastJump
      totals.ts                       # merge totals, active time, first seen; stored record shape
      rate-limits.ts                  # parse rate limits and reset times
      normalize.ts                    # unknown to usage, jump, lastJump, totals slices

    bridge/                           # main agent status
      index.ts                        # barrel
      types.ts                        # alias to bridge slice
      reducers.ts                     # model, effort, permission mode, compactions, current activity
      task-step.ts                    # current step from the task-list tool input
      normalize.ts                    # unknown to bridge slice

    blackbox/                         # event log
      index.ts                        # barrel
      types.ts                        # alias to blackbox slice; Writer union
      writers.ts                      # WRITER_NAME table (Captain, Bridge, Shields, Council, Comms)
      entries.ts                      # entry builders (prompt, slash command, verdict, transmission, shuttle event)
      reducers.ts                     # appendEntry with cap, newest first
      page.ts                         # page of 10, per-shuttle filter
      normalize.ts                    # unknown to blackbox slice

    commands/                         # /skywatch argument parsing
      index.ts                        # barrel
      parse.ts                        # args to SkywatchCommand union (launch, dock, recalibrate, hazards, directives)

    config/                           # userConfig
      index.ts                        # barrel
      modules.ts                      # MODULE_IDS const array, ModuleId union, default order
      parse.ts                        # options to Config (modules, decks, autoLaunch, hazards) with defaults

    state/                            # the only users of atom/read/update
      index.ts                        # barrel: types, readerOf, writerOf, migrateState
      types.ts                        # SkywatchState, SliceKey, Slice<K> aliases over the contract
      atom.ts                         # the skywatch atom declaration
      empty.ts                        # EMPTY_STATE, one initial value per key
      normalize.ts                    # NORMALIZERS table: one normalizer per key, imported from domains
      migrate.ts                      # SCHEMA_VERSION and MIGRATIONS table of version steps
      read.ts                         # readerOf($): normalized, read-only access
      write.ts                        # writerOf($): update/patch with normalization in one place

    io/                               # thin $ adapters other than state
      index.ts                        # barrel
      directives-file.ts              # $.fs.read of ~/.claude and project directive files
      measure-runner.ts               # $.process.run for MeasureStep[] with timeout, returns StepOutput[]
      totals-store.ts                 # $.store load/save of totals per session id
      session-info.ts                 # $.session reads: id, cwd, surface, model
      pane-control.ts                 # $.ui launch, dock and focus of the pane

    events/                           # hook families; the only callers of on(...)
      index.ts                        # registerHooks(on, deps): calls each family's register
      context.ts                      # HookContext, RenderContext, makeContext($, deps)
      scratch.ts                      # per-session transient values, held in the register closure
      session.ts                      # session.start (migrate, restore totals, auto-launch), session.end (save, drop scratch)
      measure.ts                      # session.measure: hull, hazard, usage, rate limits
      command.ts                      # command.run: /skywatch and every command to the black box
      subcommands.ts                  # SUBCOMMANDS table: SkywatchCommand kind to action
      agents.ts                       # agent.offer, agent.spawn: shuttles, probes, council roster
      turn.ts                         # turn.start, turn.complete: jumps, bridge activity
      stream.ts                       # turn.step generator wrapper: chunk counting, throttled writes
      tool-check.ts                   # tool.check: shields verdicts, force field gate for Bash
      forcefield-gate.ts              # classify, directives, measure, ruling to permission verdict
      tool-call.ts                    # tool.call: redacted summaries, bridge/shuttle activity, transmissions
      append.ts                       # session.append: captain prompts, council advice, black box entries
      render.ts                       # ui.render for SessionMode, PromptHint, AbovePrompt, Pane via SURFACE_RENDERERS
      pane-actions.ts                 # PaneActions: fold, open shuttle, deck hotkey, black box page

    ui/
      index.ts                        # barrel: SURFACES (renderers per surface), types
      kit.ts                          # UiKit type and makeKit(resolved elements)
      env.ts                          # ViewEnv (surface, now, config), PaneActions type
      theme/
        index.ts                      # barrel
        colours.ts                    # palette tokens
        semantic.ts                   # colour tables keyed by Verdict, hazard step, Writer, shuttle status
        glyphs.ts                     # symbols: dots, chevrons, gauge cells, separators
      primitives/
        index.ts                      # barrel
        frame.tsx                     # Frame: titled module frame with optional count and fold
        gauge.tsx                     # Gauge: fill bar with hazard colour
        row.tsx                       # Row: label/value line
        fold.tsx                      # Fold: collapsible block, chevron centred on its lines
        dots.tsx                      # Dots: dot strip with colour per item
        counts.tsx                    # Counts: labelled tallies from a Record
        timeline.tsx                  # Timeline: SVG axis and marks shared by bridge and council
        live-clock.tsx                # LiveClock: only Client wrapper for client/clock.tsx
        loader.tsx                    # Loader: only Client wrapper for client/loader.tsx
      surfaces/
        viewscreen.tsx                # AbovePrompt band: gauge, jump delta, duration, tok/s, loader
        beacon.tsx                    # one-line hazard entry for SessionMode or PromptHint
        pane.tsx                      # Pane root: maps config.modules through MODULE_VIEWS
      modules/
        registry.ts                   # MODULE_VIEWS: Record<ModuleId, ModuleView>
        bridge/
          view.ts                     # selectBridge(state, env): BridgeModel | null
          bridge-module.tsx           # BridgeModule: status rows, gauge, speeds, activity, shuttle counts
          flight-paths.tsx            # FlightPaths: desktop-only SVG of shuttle flight paths
        council/
          view.ts                     # selectCouncil
          council-module.tsx          # CouncilModule: timeline, moments, last advice
        shields/
          view.ts                     # selectShields
          shields-module.tsx          # ShieldsModule: decks, force field counts, held call
          deck-row.tsx                # DeckRow: one deck with verdict counts and hotkey
          held-call.tsx               # HeldCall: held risky call, live wait clock, measure
        shuttles/
          view.ts                     # selectShuttles
          shuttles-module.tsx         # ShuttlesModule: card list, docked lines, number keys
          shuttle-card.tsx            # ShuttleCard: effort, model, tokens, steps, clock, step, answer, last tool
        probes/
          view.ts                     # selectProbes
          probes-module.tsx           # ProbesModule: probe dots
        mission/
          view.ts                     # selectMission
          mission-module.tsx          # MissionModule: totals, running and last jump
          rate-limits.tsx             # RateLimits: limits with reset times
        blackbox/
          view.ts                     # selectBlackbox: page and per-shuttle filter
          blackbox-module.tsx         # BlackboxModule: entry list and pager
          entry-row.tsx               # EntryRow: writer, time, text, fold

    client/                           # Client surface modules; self-contained, no imports
      clock.tsx                       # live elapsed clock
      loader.tsx                      # animated viewscreen loader

  tests/                              # *.test.ts(x), run by claude plugin test claude-code
    support/
      builders.ts                     # state and slice builders with defaults
      context.ts                      # fake HookContext: in-memory state, scripted io
      fixtures.ts                     # stored state samples from older schema versions
    core/
      format.test.ts                  # token, duration, cost, rate formatting
      text.test.ts                    # capitalize, plural, truncate, measured padding
      redact.test.ts                  # credential masking
      shell.test.ts                   # tokenize, segments, scope (quotes, heredocs, subshells, cd/pushd/git -C)
    forcefield/
      classify.test.ts                # table of commands to expected Risk per group
      temp-paths.test.ts              # temp folder pass
      directives.test.ts              # parse, last match wins, defaults
      measure.test.ts                 # plan steps are read-only; summaries
      ruling.test.ts                  # pass/hold/block outcomes
    calls/summary.test.ts             # per-tool summaries
    hazard/scale.test.ts              # step boundaries
    shields/reducers.test.ts          # verdict recording, decks, held call
    fleet/shuttles.test.ts            # shuttle lifecycle and attribution
    fleet/probes.test.ts              # unclaimed loops
    council/moments.test.ts           # moment inference
    mission/usage.test.ts             # usage, jump and totals arithmetic
    blackbox/page.test.ts             # cap, order, paging, filter
    config/parse.test.ts              # userConfig defaults and invalid input
    commands/parse.test.ts            # /skywatch arguments
    state/normalize.test.ts           # fixtures normalize to current shapes
    state/migrate.test.ts             # each schema step
    events/forcefield-gate.test.ts    # hold becomes ask with measure, block becomes deny
    ui/pane.test.tsx                  # module order, empty modules take no room
    ui/viewscreen.test.tsx            # band content per hazard step

package.json                          # repo root: dev-only scripts and devDependencies
biome.json                            # format and lint rules
tsconfig.json                         # strict type-check of claude-code/
.editorconfig                         # two-space indent, LF, final newline
.gitignore                            # node_modules, claude-code/.claude-plugin/types/
scripts/
  check-layers.sh                     # dependency rules of section 2 as rg checks
  validate-diff.sh                    # compare validate output with the baseline, paths stripped
  validate-baseline.txt               # validate output captured before the refactor
```

## 2. Layering and dependency rules

Layers, lowest first:

| Layer | Folders | May touch `$` |
| --- | --- | --- |
| 0 core | `core/` | no |
| 1 domain | `calls, hazard, forcefield, shields, fleet, council, mission, bridge, blackbox, commands, config` | no |
| 2 adapters | `state/`, `io/` | yes |
| 3 ui | `ui/` | no (gets a `UiKit`) |
| 4 hooks | `events/` | yes |
| 5 entry | `skywatch.ts` | no (wires only) |
| isolated | `client/`, `tests/` | no |

Domain order (a domain imports only domains to its left): `calls, hazard, forcefield, shields, fleet, council, mission, bridge, blackbox, commands, config`.

Rules, each checkable with `rg` in `scripts/check-layers.sh`:

1. `core/**` imports only from `core/`.
2. A domain folder imports only `core/` and domain folders earlier in the domain order.
3. `state/**` and `io/**` import only `core/`, domains and `'claude-code'`; `io/` never imports `state/`.
4. `ui/**` imports only `core/`, domains, `ui/**`, and `import type` from `state/`.
5. `events/**` may import any lower layer; files that call `on(` do not import each other.
6. Only `skywatch.ts` imports `events/`. Nothing imports `tests/`.
7. Value imports from `'claude-code'` (`atom`, `read`, `update`) appear only in `state/`. Type-only imports from `'claude-code'` are allowed outside `client/`.
8. `$.` appears only in `state/read.ts`, `state/write.ts`, `io/**`, `events/**`.
9. `writerOf`, `StateWriter`, `update(` and `patch(` never appear in `ui/**` or `events/render.ts`.
10. Imports across folders end at an `index.ts`; deep paths only within one folder.
11. No `import(`, `require(`, `node:`, `process.`, `document`, `window` anywhere under `hooks/`.
12. `client/**` has no `import` lines. `Client` and `module=` appear only in `ui/primitives/live-clock.tsx` and `ui/primitives/loader.tsx`.
13. `hooks/hooks.json` names `skywatch.ts` and nothing else.
14. No module-level `let`, and no module-level `Map`/`Set`/array that is mutated, under `hooks/`.

## 3. State access

One atom, one reader, one writer. Normalization runs in one place.

```ts
// state/types.ts
type SkywatchState = PluginState['skywatch']
type SliceKey = keyof SkywatchState
type Slice<K extends SliceKey> = SkywatchState[K]

// state/normalize.ts
type Normalizer<K extends SliceKey> = (raw: unknown) => Slice<K>
const NORMALIZERS: { readonly [K in SliceKey]: Normalizer<K> }
function normalizeState(raw: unknown): SkywatchState

// state/migrate.ts
const SCHEMA_VERSION: number
const MIGRATIONS: Readonly<Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>>
function migrateState(raw: unknown): SkywatchState

// state/read.ts
interface StateReader {
  all(): SkywatchState
  get<K extends SliceKey>(key: K): Slice<K>
}
function readerOf($: Engine): StateReader

// state/write.ts
interface StateWriter extends StateReader {
  update<K extends SliceKey>(key: K, change: (slice: Slice<K>) => Slice<K>): void
  patch<K extends SliceKey>(key: K, partial: Partial<Slice<K>>): void
  updateMany(change: (state: SkywatchState) => Partial<SkywatchState>): void
}
function writerOf($: Engine): StateWriter
```

- `writerOf` reads the atom, normalizes, applies `change`, writes the whole slice. Callers never spread or normalize.
- Reducers in domains are pure `(slice, input) => slice`; handlers call `ctx.state.update('shuttles', (fleet) => stepShuttle(fleet, event))`.
- Repeated list edits use `core/list.ts` (`updateById`), so the shuttle-update pattern exists once.
- `session.start` runs `migrateState` and writes the result once. Reads also normalize, so older shapes never reach UI code.
- Each domain owns the normalizer for its slices (`fleet/normalize.ts`); `state/normalize.ts` only assembles the table, so a missing key is a type error.
- Keys and shapes in `types/index.d.ts` stay as they are. Any shape change needs a `MIGRATIONS` step and a fixture test.

## 4. Hook handlers and context

One file per event family (`events/*.ts`, see tree). Each exports `register<Family>(on, deps)`.

```ts
// events/context.ts
interface HookDeps {
  readonly config: Config
  readonly scratch: ScratchRegistry
}
interface HookIo {
  readDirectives(): Promise<readonly string[]>
  runMeasure(steps: readonly MeasureStep[]): Promise<readonly StepOutput[]>
  loadTotals(sessionId: string): Promise<Totals | undefined>
  saveTotals(sessionId: string, totals: Totals): Promise<void>
  pane: PaneControl
}
interface HookContext {
  readonly config: Config
  readonly state: StateWriter
  readonly io: HookIo
  readonly session: SessionInfo   // id, cwd, surface
  readonly now: number
  readonly scratch: Scratch
}
interface RenderContext {
  readonly config: Config
  readonly state: StateReader
  readonly env: ViewEnv
  readonly actions: PaneActions
}
function makeContext($: Engine, deps: HookDeps): HookContext
function makeRenderContext($: Engine, deps: HookDeps): RenderContext

type Handler<E, R> = (ctx: HookContext, event: E, next: () => R) => R
function bind<E, R>(deps: HookDeps, handler: Handler<E, R>): ($: Engine, event: E, next: () => R) => R

// events/scratch.ts
interface ScratchRegistry {
  get(sessionId: string): Scratch
  drop(sessionId: string): void
}
function createScratchRegistry(): ScratchRegistry

// skywatch.ts
export function register(on: On, options: unknown): void
```

- `register` parses config once and creates the scratch registry; both live in its closure and reach handlers through `bind`. No module globals.
- `Scratch` holds only transient per-session values that render never shows (stream chunk counters, last flush time). Anything the pane shows lives in `$.state`.
- Handlers reach `$` only through `ctx`, so tests build a `HookContext` from `tests/support/context.ts`.
- `turn.step` wraps the chunk generator and writes at most once per `STREAM_FLUSH_MS` (`core/limits.ts`).
- `/skywatch` parses args with `commands/parse.ts`, then dispatches through `SUBCOMMANDS: { [K in SkywatchCommand['kind']]: (ctx, command) => Promise<void> }`.
- Directive files are read with the same cadence as today; any cache lives in `Scratch`.

## 5. Pane UI

`events/render.ts` resolves elements once per render (`makeKit($.ui.resolve(e))`), builds a `RenderContext`, and calls the surface renderer from a table. Components are pure functions of `(kit, model, env, actions)`.

```ts
// ui/kit.ts
interface UiKit {
  readonly Box: Component<BoxProps>
  readonly Text: Component<TextProps>
  readonly Button: Component<ButtonProps>
  readonly Svg: Component<SvgProps>
  readonly Client: Component<ClientProps>
}

// ui/env.ts
type Surface = 'desktop' | 'terminal'
interface ViewEnv { readonly surface: Surface; readonly now: number; readonly config: Config }
interface PaneActions {
  toggleFold(id: string): void
  openShuttle(index: number): void
  focusDeck(deck: Deck): void
  pageBlackbox(step: 1 | -1): void
}

// ui/index.ts
type SurfaceId = 'SessionMode' | 'PromptHint' | 'AbovePrompt' | 'Pane'
type SurfaceRenderer = (kit: UiKit, state: SkywatchState, env: ViewEnv, actions: PaneActions) => UiNode | null
const SURFACES: Readonly<Record<SurfaceId, SurfaceRenderer>>

// ui/modules/registry.ts
interface ModuleView<M> {
  readonly title: string
  select(state: SkywatchState, env: ViewEnv): M | null
  render(props: { kit: UiKit; model: M; env: ViewEnv; actions: PaneActions }): UiNode
}
type ModuleModels = {
  bridge: BridgeModel; council: CouncilModel; shields: ShieldsModel; shuttles: ShuttlesModel
  probes: ProbesModel; mission: MissionModel; blackbox: BlackboxModel
}
const MODULE_VIEWS: { readonly [K in ModuleId]: ModuleView<ModuleModels[K]> }
```

- The pane maps `config.modules` through `MODULE_VIEWS`; `select` returning `null` means the module takes no room. No ternary picks a module.
- Beacon placement is a table: `BEACON_SURFACE: Record<Surface, SurfaceId>` (`terminal` uses `PromptHint`). Hazard mode `off` returns `null` from both hazard surfaces.
- Desktop-only parts (flight paths) check `env.surface` inside the module's `select`, not in JSX.
- Shared look lives in `ui/primitives/`: every module uses `Frame`, `Row`, `Gauge`, `Fold`, `Counts`; bridge and council share `Timeline`.
- `Client` paths are string literals relative to the JSX file, written once each: `ui/primitives/live-clock.tsx` uses `'../../client/clock.tsx'`, `ui/primitives/loader.tsx` uses `'../../client/loader.tsx'` (same literal form as today, only the relative prefix changes).
- `client/*.tsx` import nothing. The clock keeps its own minute:second formatting with a one-line why-comment (runs on the drawing thread without `$` or mod imports).
- Interaction writes go through `PaneActions`, implemented in `events/pane-actions.ts` with the same engine mechanism the pane uses today. They run on press, never during render.

## 6. Force field

Flow in `events/forcefield-gate.ts` for a Bash `tool.check`:

1. `classifyCommand(command, cwd)` splits with `core/shell`, tracks `cd`/`pushd`/`git -C` scope, and asks the classifier table for each segment. Heredoc bodies and quoted strings are never read as commands.
2. `parseDirectives` over both files (user, then project); `ruleOn` applies last match wins over `DEFAULT_ACTIONS`.
3. `hold`: `planMeasure(risk)` gives read-only steps, `ctx.io.runMeasure` runs them, `plan.summarize` gives the measure; the verdict becomes `ask` with the measure as reason. `block`: `deny`. `pass`: unchanged.
4. Shields records the check, held/refused/blocked counts, and the held call with its start time.

```ts
// forcefield/risk.ts
const RISK_GROUPS: readonly ['delete', 'git', 'cluster', 'release', 'database', 'secret']  // names copied from today's directive groups
type RiskGroup = (typeof RISK_GROUPS)[number]
type GitAction = 'reset-hard' | 'clean' | 'push-force' | 'branch-delete' | 'stash-drop'
type Risk =
  | { group: 'delete'; tool: 'rm' | 'find'; command: string; cwd: string; targets: readonly string[] }
  | { group: 'git'; action: GitAction; command: string; cwd: string; ref?: string }
  | { group: 'cluster'; tool: 'docker' | 'kubectl' | 'helm' | 'terraform'; command: string }
  | { group: 'release'; action: 'publish' | 'merge'; tool: string; command: string }
  | { group: 'database'; action: 'migrate' | 'sql'; command: string }
  | { group: 'secret'; file: string; command: string }

// forcefield/classifiers.ts
interface Segment { readonly program: string; readonly args: readonly string[]; readonly raw: string }
interface ShellScope { readonly cwd: string }
type Classifier = (segment: Segment, scope: ShellScope) => Risk | null
const PROGRAM_CLASSIFIERS: Readonly<Record<string, Classifier>>   // rm, find, git, docker, kubectl, helm, terraform, npm, pnpm, yarn, cargo, gh, psql, mysql, ...
const ANY_PROGRAM_CHECKS: readonly Classifier[]                    // secrets
function classifyCommand(command: string, cwd: string): readonly Risk[]

// forcefield/directives
type DirectiveAction = 'pass' | 'hold' | 'block'
type DirectiveTarget = { kind: 'group'; group: RiskGroup } | { kind: 'glob'; pattern: string }
interface Directive { readonly action: DirectiveAction; readonly target: DirectiveTarget }
function parseDirectives(text: string): readonly Directive[]

// forcefield/ruling.ts
type Ruling =
  | { action: 'pass' }
  | { action: 'hold' | 'block'; risk: Risk | null; directive: Directive | null }
function ruleOn(risks: readonly Risk[], command: string, directives: readonly Directive[]): Ruling

// forcefield/measure
interface MeasureStep { readonly program: string; readonly args: readonly string[]; readonly cwd: string; readonly env: Readonly<Record<string, string>> }
interface StepOutput { readonly code: number; readonly stdout: string }
interface MeasurePlan { readonly steps: readonly MeasureStep[]; summarize(outputs: readonly StepOutput[]): string }
const MEASURE_PLANNERS: { readonly [G in RiskGroup]: (risk: Extract<Risk, { group: G }>) => MeasurePlan }
```

- `rules/rm.ts` returns `null` when every target is inside a temp folder (`temp-paths.ts`).
- Measures never use `-delete`, and git measures always apply `git-env.ts` (hooks, pagers, filters off).
- The exact group names and the program list are lifted from the current code unchanged; directive files are user data.

## 7. Constants, theme, types

- Shared numbers: `core/limits.ts` (black box page size, list caps, truncation widths, measure timeout, stream flush interval).
- Domain constants sit with their domain: `HAZARD_STEPS`, `RISK_GROUPS`, `VERDICTS`, `DECKS`, `MODULE_IDS`, `WRITER_NAME`, `TEMP_ROOTS`.
- Closed sets are `as const` arrays plus a derived union; their labels are `Record<Union, string>` tables in the domain.
- Colours: `ui/theme/colours.ts` holds the palette; `ui/theme/semantic.ts` maps domain unions to palette tokens (`VERDICT_COLOUR: Record<Verdict, Colour>`, `HAZARD_COLOUR`, `WRITER_COLOUR`, `STATUS_COLOUR`). Domains never mention colours. Glyphs in `ui/theme/glyphs.ts`; widths are computed from the strings they measure.
- State contract: `types/index.d.ts` is the only declaration of persisted shapes. Domain `types.ts` files alias it by indexed access (`type Shuttle = PluginState['skywatch']['shuttles'][...]`) or use interfaces it already names; they never redeclare a persisted shape.
- Non-persisted domain types (`Risk`, `Directive`, `Ruling`, `Config`, `SkywatchCommand`, view models) live in their owning folder and are exported from its barrel.

## 8. Tests

- Layout: `claude-code/tests/` mirrors the source domains (tree above); helpers in `tests/support/`. Confirm in step 0 that `claude plugin validate` ignores `tests/`; otherwise move tests beside the source as `*.test.ts`.
- Pure tests take plain values; event tests use the fake `HookContext`; UI tests use `$.ui.mount`. No fs, network or process.
- Cover first, in this order:
  1. Force field classification: table of commands per group, including quotes, heredocs, subshells, `cd`/`pushd`/`git -C`, temp-folder `rm`, dotenv reads.
  2. Directives: parse, last match wins, user vs project, defaults; ruling outcomes.
  3. Measure plans: every step is read-only; git env flags present.
  4. Redaction.
  5. State normalize and migrate against fixtures of older stored shapes.
  6. Formatting and text helpers.
  7. Reducers: shields, shuttles, probes, council moments, usage/jump/totals, black box paging.
  8. UI mounts: pane module order and empty modules, viewscreen per hazard step.
- Characterization tests for steps 1 to 4 are written against the current `core.ts` and `forcefield.mjs` exports before any code moves, then re-pointed to the new barrels.

## 9. Root tooling

| File | Holds |
| --- | --- |
| `package.json` | `private: true`; devDependencies `@biomejs/biome`, `typescript`; scripts below |
| `biome.json` | single quotes, no semicolons, two-space indent; lint: no nested ternary, no explicit `any`, no non-null assertion, naming convention, no unused imports/variables; ignores `.claude-plugin/types` |
| `tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noEmit`, `module`/`target` `es2022`, `moduleResolution` `bundler`, `allowImportingTsExtensions`, `lib: ["es2022"]`, `types: []` (no DOM, no Node), `jsx: react`, `jsxFactory: h`, `paths` for `claude-code` and `claude-code/testing` to `claude-code/.claude-plugin/types/` |
| `.editorconfig` | indent, line endings, final newline |
| `.gitignore` | `node_modules/`, `claude-code/.claude-plugin/types/` |
| `scripts/check-layers.sh` | rules of section 2 as `rg` checks; non-zero exit on any hit |
| `scripts/validate-diff.sh` | runs validate, strips paths, diffs against `validate-baseline.txt` |

Scripts:

```
format       biome format --write .
lint         biome lint .
typecheck    tsc -p tsconfig.json
layers       sh scripts/check-layers.sh
validate     claude plugin validate claude-code && sh scripts/validate-diff.sh
test         claude plugin test claude-code
check        biome check . && npm run typecheck && npm run layers && npm run validate && npm test
```

`typecheck` needs the engine-generated types; load the mod in development once to create them.

## 10. Migration order

Each step is its own commit (or small series), leaves the mod loadable, and ends with `npm run check` passing for the parts already in place. Refactor and behaviour commits stay separate.

0. Tooling: root `package.json`, `biome.json`, `tsconfig.json` (with `allowJs` for `forcefield.mjs` while it exists), `.editorconfig`, `.gitignore`, `scripts/`. Capture `validate-baseline.txt`. One formatting-only commit for existing files.
1. Characterization tests for `core.ts` and `forcefield.mjs` exports plus state fixtures.
2. `core/` helpers. `core.ts` delegates to them; duplicates (capitalize, plural, segment split, tallies) collapse to one each.
3. `forcefield/` in TypeScript (classify, `rules/`, directives, measure, ruling). `starbase.tsx` imports the barrel; delete `forcefield.mjs`; drop `allowJs`.
4. Domain folders, one commit each: `calls`, `hazard`, `shields`, `fleet`, `council`, `mission`, `bridge`, `blackbox`, `commands`, `config`. Move reducers and helpers out of `core.ts`; delete `core.ts` when empty.
5. `state/`: atom, empty, normalizers, migrate, reader, writer. Replace every normalize-then-spread `update` in `starbase.tsx` with `ctx.state.update/patch`.
6. `io/` adapters: move `$.fs`, `$.process`, `$.store`, `$.session`, pane `$.ui` calls out of `starbase.tsx`.
7. `events/`: `context.ts`, `scratch.ts`, then move one hook family at a time out of `register` into its file; module globals move to state or scratch. Run `validate-diff.sh` after each family.
8. `ui/`: `kit`, `theme`, `primitives`; then one pane module at a time into `ui/modules/*` behind `MODULE_VIEWS` (unmigrated modules keep a temporary legacy view entry); then `viewscreen`, `beacon`, `pane`. Move `clock.tsx` and `loader.tsx` into `client/` and update their `Client` literals in the same commit.
9. Entry: `starbase.tsx` becomes `skywatch.ts` (register only); update `hooks/hooks.json` in the same commit. `validate-diff.sh` shows path changes only.
10. Tighten: enable the full Biome rule set and `check-layers.sh` in `check`, remove legacy view entries and shims, confirm every file is under 300 lines.

## Open points to confirm in step 0

- Whether `claude plugin validate` scans `tests/`; decides test placement.
- The exact `Client` `module` literal form the engine accepts (extension, `./` prefix).
- The engine's `$` and element type names for `Engine`, `On`, `UiNode`, `Component`.
- Whether `PluginState` is global or declared on `'claude-code'`; decides how domain `types.ts` alias it.
