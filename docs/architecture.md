# SkyWatch architecture

The structure the refactor follows, file by file. Behaviour, user-visible text, stored data and the `claude plugin validate` lists (hooks, calls, state keys) stay the same; only paths change. Words follow the [glossary](glossary.md), code rules follow [conventions.md](conventions.md), runtime rules follow [claude-code/AGENTS.md](../claude-code/AGENTS.md).

## 1. Engine rules this design is built on

Verified by running `claude plugin validate` and `claude plugin test` on a scratch copy of the mod. A module that breaks rules 1 to 4 does not load.

1. **Atoms live with their reads and writes.** `read($, x)` and `update($, x, fn)` are accepted only when `x` is an atom made by `atom({ plugin: 'skywatch', key: '…' } as const, …)` in the same file. An atom imported from another file, an atom passed as a parameter, or `ATOMS[key]` is refused. So one file holds all 13 atoms and every `read`/`update`.
2. **`$` is spelled literally.** It may be passed as the first argument to a named `function` declaration (any file, through barrels, any depth) or captured by a closure inside such a function. It may not be stored in an object, passed through a table (`TABLE[kind]($, …)`), or passed to an arrow function stored in a `const` in another file. So every helper that takes `$` is a top-level `function` declaration, and dispatch over `$` helpers is a `switch`.
3. **`on` is spelled literally**: `on('<event>', matcher?, hook)`. It may be passed on as a parameter named `on`.
4. **Hook matchers are literals** (`{ component: 'Pane', requestId: 'skywatch' }`, `{ command: 'skywatch' }`). A constant imported from another file reads as `requestId=?`.
5. **JSX function components work.** `h` takes a component function; components return one `RenderNode`. `<>…</>` is a column `Box`, so inline pieces return one `Text` that wraps their runs.
6. **A `Client` `module` literal is relative to the file holding the JSX** (`"./clients/clock.tsx"` from `src/ui/widgets.tsx` resolves to `src/ui/clients/clock.tsx`). A client module may import pure plugin files.
7. **Tests.** `claude plugin test` runs every `*.test.ts(x)` under `tests/`, nested folders included; `validate` does not scan `tests/`. A test answers an engine noun with `on('<noun.event>', () => ({ value }))` (`process.run`, `fs.read`, `session.cwd`, `ui.open`, `ui.status`, …), raises a tool call through the mod with `$.tool.call({ tool, …, agentId? })`, and draws with `$.ui.mount`. No fake context is needed.
8. The engine's `tsconfig` (`.claude-plugin/types/tsconfig.json`) already includes `hooks`, `types`, `src` and `tests`, with `strict` and `noUncheckedIndexedAccess`.

## 2. Layout decision

Code lives in `claude-code/src/`, and `claude-code/hooks/` holds only `hooks.json` and the one-file entry `skywatch.ts`: the engine's own tsconfig names `src` as a source folder, and the hooks folder then says at a glance what the engine loads.

Layers, lowest first. Each folder is one layer; inside a layer, files are split by domain (bridge, council, shields, fleet, mission, black box).

| Layer | Folder | Takes `$` | Holds |
| --- | --- | --- | --- |
| 0 | `src/core/` | no | generic helpers, config |
| 1 | `src/domain/` | no | defaults, normalizers and reducers for each state key |
| 2 | `src/forcefield/` | only `folders.ts`, `load.ts`, `hold.ts`, `measure/*` | risky-command classification, directives, measures |
| 3 | `src/state/` | yes | the 13 atoms, typed access, shared state actions |
| 3 | `src/ui/` | no | components, theme, client modules |
| 4 | `src/events/` | yes | `on(...)` registrations and the runtime |
| 5 | `hooks/skywatch.ts` | no | `register` |

## 3. File tree

Every file, as built. None passes 300 lines.

```
skywatch/
  .claude-plugin/marketplace.json        marketplace entry pointing at claude-code/
  AGENTS.md, CLAUDE.md -> AGENTS.md      repo map, rules and commands
  LICENSE, NOTICE                        the project's license and third-party notices
  README.md
  package.json, package-lock.json        dev-only scripts and devDependencies (Biome, TypeScript)
  biome.json                             format and lint rules
  scripts/
    validate-snapshot.sh                 prints validate's lists normalized (needs jq)
    validate-baseline.txt                the snapshot every change must reproduce
    golden.sh                            regenerates tests/support/golden.ts from the pre-refactor commit
    golden/print-golden.test.ts          runs the old modules over the corpus inside a copy of the old plugin
    golden/write-golden.mjs              writes golden.ts from that run's output
  docs/
    brief.md, architecture-draft.md (superseded), architecture.md, conventions.md, glossary.md
    code-review-findings.md, reviews/    the review that started the refactor, and the reviews of it
  claude-code/
    .claude-plugin/plugin.json           manifest and userConfig
    .claude-plugin/types/                engine-written API types, git-ignored
    AGENTS.md, CLAUDE.md -> AGENTS.md    mod runtime rules and test notes
    LICENSE, NOTICE, README.md
    tsconfig.json                        extends the engine tsconfig
    types/index.d.ts                     the $.state contract: stored shapes and their closed unions
    hooks/
      hooks.json                         { "modules": ["./skywatch.ts"] }
      skywatch.ts                        register(on, options): registerHooks(on, parseConfig(options))
    src/
      core/        guards.ts (isRecord, mergeDefaults, NullableFields, listOf, isString, isNumber, isOneOf, stringOf) ·
                   text.ts (capitalize, plural, baseName, shorten) · format.ts (SECOND_MS, every fmt*, kTokens, limitLabel, lineCost,
                   prettyModel) · redact.ts · config.ts (MODULES, DECKS, HAZARD_MODES, parseConfig)
      domain/      defaults.ts · normalize.ts (one per key; unknown verdicts, statuses, decks narrowed) ·
                   calls.ts · tasks.ts · bridge.ts · usage.ts · mission.ts · council.ts · shields.ts · fleet.ts ·
                   blackbox.ts (WRITERS, BLACKBOX_PAGE, newEntry, promptLine, keyedEntries) · view.ts (PaneActions)
      forcefield/  risk.ts (RISK_GROUPS, Risk, RiskOf, Measure, Held, ActiveHold, unmeasured) · process.ts (script name,
                   timeouts, nonEmptyLines) · shell.ts (heredocs, quotes, segments, words, joinDir) ·
                   classify.ts · classifiers/ (types, delete, git, infra, publish, database, index: a Map by
                   program) · secrets.ts · directives.ts · verdict.ts · folders.ts ($) · load.ts ($) · hold.ts ($) ·
                   measure/ (result.ts builders; paths.ts, git.ts, refs.ts measurers; index.ts switch)
      state/       atoms.ts (the 13 atoms, get/patch per key, migrateState) · log.ts · council.ts · bridge.ts ·
                   mission.ts (recordUsage, readUsage, costNow, contextNow, addJumpTokens) · session.ts
                   (resetAll, loadTotals, saveTotals, followSession) · view.ts (paneActions)
      ui/          context.ts (DrawContext, UiContext, PaneData, ModuleView, uiContext) · palette.ts (presets) · theme.ts (status looks) ·
                   metrics.ts (widths, hotkeys) · hazard.ts · layout.tsx (Row, RowBlock, Sep, Ruler, Blank, Stack,
                   Border) · widgets.tsx (gaugeCells, Bar, Effort, Tally, Fold, LiveClock, Connector: the only Client
                   tags) · frame.tsx (ModuleFrame) · beacon.ts · viewscreen.tsx · pane.tsx · modules/ (index
                   MODULE_VIEWS, bridge, council, shields, shuttles, probes, mission, blackbox; parts/ index,
                   held, shuttle-card, flight-paths) · clients/ (clock, loader)
      events/      runtime.ts (Runtime, heldNow, hasBlockDirective) · status.ts (openPane, hazardsNow, readBeacon,
                   refreshStatus) · session.ts · commands.ts · agents.ts · jumps.ts · tools.ts · render.tsx ·
                   index.ts (registerHooks)
    tests/
      support/     world.ts (engine nouns) · drive.ts (typed kit inputs) · fixtures.ts (STORED per key) ·
                   corpus/ (inputs) · golden.ts (generated pre-refactor outputs)
      core/ domain/ forcefield/ events/ ui/   one test file per source area; events and ui go through the kit
```

## 4. Layer and import rules

1. `core/` imports only `core/`, plus `import type` from `types/` and `'claude-code'`.
2. `domain/` imports `core/` and types.
3. `forcefield/` imports `core/`, `domain/` and types. Its pure files never import its `$` files (`folders.ts`, `load.ts`, `hold.ts`, `measure/*`).
4. `state/` imports `core/`, `domain/`, types, and `atom`/`read`/`update` from `'claude-code'` (only in `atoms.ts`).
5. `ui/` imports `core/`, `domain/`, and types from `forcefield/` (`ActiveHold`). Never `state/` or `events/`; never takes `$`. `ui/clients/*` import only `core/`.
6. `events/` imports any lower layer. Files that call `on(` do not import each other; shared helpers live in `runtime.ts` and `status.ts`.
7. `hooks/skywatch.ts` imports only `core/` and `events/`.
8. Across folders, import from the folder's `index.ts`. Inside a folder, import siblings directly.
9. Every function that takes `$` is a top-level `function` declaration with `$` as its first parameter. No `$` in arrow `const`s, objects or tables.
10. No module-level `let`, and no module-level `Map`, `Set` or array that is mutated. Per-session memory lives in the `Runtime` (section 6).
11. No `import()`, `require`, `node:`, DOM or Node globals.
12. Hook matchers and `atom` refs are string literals.

Rules 4, 9 and 12 are enforced by `validate` itself (the mod stops loading). The rest are checked in review; no layering script.

## 5. State access

### Contract (`types/index.d.ts`)

Keys and stored shapes stay. Changes are type-level and read-compatible (normalization fills what older state lacks), so `SCHEMA_VERSION` stays 2.

- Closed unions declared here because they are persisted: `Deck`, `Verdict`, `HazardMode`, `Moment`, `ShuttleStatus = 'running' | 'done' | 'stopped' | 'failed'`, `EntryKind = 'info' | 'error' | 'transmission' | 'done'`. `DeckName` is removed (`Check.deck`, `View.deckOpen` and the `Shields.totals` key use `Deck`; totals become `Partial<Record<Deck, Tally>>`).
- `Speed = { ttftMs: number; tokPerS: number | null }` replaces the repeated literal; `HeldTally = { ran: number; refused: number; blocked: number }`.
- `Shields.held: HeldTally` is required. `View.hazards: HazardMode | null`.
- Fields the normalizer always fills become required: `Bridge.speed, doing, doingTitle, command, task, plan, avg`; `Usage.history`; `Shuttle.doing, doingTitle, task, effort, speed, avg`; `BlackboxEntry.cost: LineCost | null`; `Jump.tokIn, tokOut, promptAt`; `View.unfolded, entriesShown, hazards`. Each default is today's fallback (`null`, `[]`, `''`, `0`, `DEFAULT_AVG`, `BLACKBOX_PAGE`), so every read gives what `?? x` gave before.
- Doc comments: one `/** */` per declaration, only where the name does not say it (finding 40).
- Code imports these with `import type { … } from '../../types'`. `PluginState` stays in `declare module 'claude-code'`.

### Normalization (`domain/normalize.ts`)

```ts
export function normalizeBridge(stored: unknown): Bridge
// one per key: Usage, Council, Shields, Shuttles (Shuttle[]), Probes (Probe[]), Blackbox (BlackboxEntry[]),
// Jump, LastJump (LastJump | null), View, CouncilRoster, Totals (SessionTotals), Meta
```

Each merges the stored object over its `DEFAULT_*` from `defaults.ts`, keeps lists only when they are lists, narrows unions with `isOneOf`, and keeps a field whose default is null only when it is null or passes its guard (`isNumber`, `isString`, a speed). `normalizeShields` normalizes `held` against `DEFAULT_SHIELDS.held` (finding 2).

### Access (`state/atoms.ts`)

The only file that imports `atom`, `read` and `update`.

```ts
export async function migrateState($: EngineInterface): Promise<void>
export async function getBridge($: EngineInterface): Promise<Bridge>
export async function patchBridge($: EngineInterface, change: (bridge: Bridge) => Bridge): Promise<void>
// the same pair for Usage, Council, Shields, Shuttles, Probes, Blackbox, Jump, LastJump, View, CouncilRoster, Totals
```

- `get<Key>` returns `normalize<Key>(await read($, atom))`.
- `patch<Key>` is `update($, atom, stored => change(normalize<Key>(stored)))`: one normalization per write, no spread at call sites (finding 12). Replacing a value is `patchJump($, () => startJump(now, cost))`.
- `meta` is read and written only by `migrateState` (today's `migrate`).
- Callers compose pure reducers: `patchShuttles($, fleet => withShuttle(fleet, id, shuttle => applyStep(shuttle, step)))` (finding 13).

### Shared state actions (`state/*.ts`)

Named `$` helpers that several hook families use. They never refresh the status; the handler does that after them, in today's order.

```ts
// log.ts
export async function logEntry($: EngineInterface, who: string, text: string, kind?: EntryKind, agentId?: string | null): Promise<number>
export async function whoIs($: EngineInterface, agentId: string | undefined): Promise<string>
export async function attachPromptCost($: EngineInterface, promptAt: number, cost: LineCost): Promise<void>
// council.ts
export async function startTransmission($: EngineInterface, id: string, via: string): Promise<void>
export async function endTransmission($: EngineInterface, report: string | null, id?: string): Promise<void>
export async function noteAdvice($: EngineInterface, advice: string): Promise<void>
export async function isCouncilType($: EngineInterface, type: string): Promise<boolean>
export async function addCouncilType($: EngineInterface, type: string): Promise<void>
export async function addCouncilId($: EngineInterface, id: string): Promise<void>
export async function markSeen($: EngineInterface, id: string): Promise<void>
// bridge.ts
export async function noteCall($: EngineInterface, agentId: string | undefined, tool: string, input: unknown): Promise<void>
export async function noteMode($: EngineInterface, mode: string | null | undefined): Promise<void>
// mission.ts
export async function recordUsage($: EngineInterface, reading: UsageReading): Promise<void>
export async function readUsage($: EngineInterface): Promise<UsageReading | null>   // null on a host without usage
export async function costNow($: EngineInterface): Promise<number | null>
export async function contextNow($: EngineInterface): Promise<number>
export async function addJumpTokens($: EngineInterface, usage: StepUsage): Promise<void>
// session.ts
export async function resetAll($: EngineInterface): Promise<void>
export async function loadTotals($: EngineInterface): Promise<void>
export async function saveTotals($: EngineInterface): Promise<void>
export async function followSession($: EngineInterface): Promise<void>   // reloads the totals when the session id moved
// view.ts
export function paneActions($: EngineInterface): PaneActions
```

`paneActions` returns closures that capture `$` (allowed by rule 2); they run on a button press, never during a render.

## 6. Hooks and per-session context

### Runtime (`events/runtime.ts`)

```ts
export type Runtime = {
  readonly config: Config
  surface: RenderSurface | null              // session.start's surface; on 'terminal' the beacon goes on the hint line
  directives: DirectiveSet                   // defaults, then ~/.claude, then the project's file
  modeSeen: string | null                    // written by the SessionMode render, read at the next jump
  readonly held: Map<string, Held>           // measured risky calls by tool_use_id, until they settle
}
export function createRuntime(config: Config): Runtime
export function heldNow(runtime: Runtime): ActiveHold | null   // the held call whose prompt is up, oldest first
export function hasBlockDirective(runtime: Runtime): boolean
```

The held call and the directives are shown by the pane but are not state keys: a new key would change the 13-key contract, and the render reads them from the closure. They replace the old module globals (`surfaceNow`, `directives`, `directiveErrors`, `modeSeen`, `risky`). `tool.check` carries the caller's `agentId` itself, so no call-to-shuttle map is kept.

### Registration

```ts
// hooks/skywatch.ts
export const register: Register = (on, options) => registerHooks(on, parseConfig(options))
// events/index.ts: createRuntime, then each family
export function registerHooks(on: On, config: Config): void
export function registerSession(on: On, runtime: Runtime): void    // session.ts
export function registerCommands(on: On, runtime: Runtime): void   // commands.ts
export function registerAgents(on: On, runtime: Runtime): void     // agents.ts
export function registerJumps(on: On, runtime: Runtime): void      // jumps.ts
export function registerTools(on: On, runtime: Runtime): void      // tools.ts
export function registerRender(on: On, runtime: Runtime): void     // render.tsx
```

- Each `on(...)` hook is an inline arrow that calls `next` itself and delegates to named `function` declarations in the same file, typed `($: EngineInterface, runtime: Runtime, e: Args<…>)`. Helpers never receive `next`.
- `turn.step` stays an inline `async function*`, timing the first piece and the stop, and writing once after the stream ends.
- `status.ts` holds the pane's opening and the beacon: `openPane`, `hazardsNow`, `readBeacon`, `refreshStatus`.
- `commands.ts` registers `command.run {command: 'skywatch'}` before the catch-all `command.run`. Sub-commands dispatch with `switch (verb)`; a bare `/skywatch` launches.
- The force field never fails open on bookkeeping: in `tool.check` the verdict is computed first and returned whatever its recording does, and in `tool.call` every write runs through `bestEffort`. A held call is dropped in a `finally` when `next` rejects. Gating hooks register no `.catch`, so validate's lines stay as they were.
- Registration order follows the families. The two `command.run` hooks keep their relative order. `validate-snapshot.sh` compares sorted lists.

### Force-field flow across the two hooks

1. `tool.call`: `noteCall` unless it is a hand-back; `holdFor($, { tool, input }, directives)`; on a draft, `runtime.held.set(id, { ...draft, who })`; then `next(e)`.
2. `tool.check` (inside that `next`): `gateVerdict(found, held)` gives `{ verdict, blockedBy }`: an `ask` with `SkyWatch: this would <summary>.`, or a `deny` with `SkyWatch blocks this: the directive "<directive>" covers it.`. On an ask, the held call gets `since: now`. The check is recorded, and a block is counted and logged.
3. Back in `tool.call`: the held call settles (`held <wait> · cleared|stopped <headline>`, ran or refused counted), the pending ask settles, then edits, errors, the shuttle's last tools and the black box.

## 7. UI composition

### Context and data (`ui/context.ts`)

```ts
export type DrawContext = { readonly els: ElementTable; readonly hasClient: boolean }
export type UiContext = DrawContext & {
  readonly surface: RenderSurface; readonly now: number; readonly width: number
  readonly hazardColor: string; readonly view: View; readonly actions: PaneActions
}
export type PaneData = {
  readonly config: Config; readonly bridge: Bridge; readonly usage: Usage; readonly council: Council
  readonly shields: Shields; readonly fleet: readonly Shuttle[]; readonly probes: readonly Probe[]
  readonly blackbox: readonly BlackboxEntry[]; readonly jump: Jump; readonly lastJump: LastJump | null
  readonly totals: SessionTotals; readonly held: ActiveHold | null; readonly hasBlockDirective: boolean
  readonly viewedAgentId: string | null
}
export type ModuleProps = { readonly ui: UiContext; readonly data: PaneData }
export type ModuleView = { isEmpty(data: PaneData): boolean; draw(props: ModuleProps): RenderNode }
export function drawContext(els: ElementTable): DrawContext
export function uiContext(pane: { els; surface; bodyColumns; now; usage; view; actions }): UiContext
```

`events/render.tsx` reads the state and the clock, then passes raw values: `uiContext` applies the minimum width and the hazard colour, so no UI rule lives in the events layer.

### Files

- `palette.ts`: the presets (`paletteOf`), each eight hazard steps (`Space`) with the roles drawn from them (`Colors`); `parsePaletteFile` reads a palette file. The palette for a surface reaches every component through `DrawContext`/`UiContext` (`ui.colors`, `ui.space`), never through a module constant.
- `theme.ts`: `VERDICT_STYLE` and `SHUTTLE_STATUS` name a role, not a colour; `entryColor` (writers in a `Map`).
- `metrics.ts`: `DECK_KEYS`, `LABEL_WIDTH`, `GAUGE_WIDTH`, `FRAME_INSET`, `SEPARATOR`, `PANE_MIN_WIDTH`, `MIN_LOADER_ROOM`.
- `hazard.ts`: `hazardOf` (coloured by a palette's space, SkyWatch's by default), `ringOf`.
- `layout.tsx`: `Row`, `RowBlock`, `Sep`, `Ruler` (`isDashed`), `Blank`, `Stack` (`items`), `Border` (`borderColor`, `borderStyle`, `isBorderDim`).
- `widgets.tsx`: `gaugeCells`, `Bar` and `Connector` (on a `DrawContext`), `Effort`, `Tally`, `Fold`, `LiveClock`. `LiveClock` and `Connector` hold the only `Client` tags: `./clients/clock.tsx`, `./clients/loader.tsx`.
- `frame.tsx`: `ModuleFrame` (`title`, `color`, `borderColor`, `note: NotePart[]`, `noteSlack`, `isActive`), drawn around its private `TitleRow`, which measures the note from its text.
- `modules/`: one file per module view, each exporting a `*_VIEW`, gathered in `MODULE_VIEWS`; `modules/parts/` holds what a view is made of (`held`, `shuttle-card`, `flight-paths`).
- `viewscreen.tsx`: `Viewscreen({ draw: DrawContext, surface, bodyColumns, usage, bridge, lastJump })`.

### Rules

- Components are PascalCase functions taking one props object. A list item that draws is a component (`DeckButton`, `CheckRow`, `PowerRow`, `ProbeDot`), not an inline arrow.
- Status-keyed looks come from the tables in `theme.ts`; widths from `metrics.ts` or a named constant measured from the text it frames (the black box's cost column is measured per entry).
- `FlightPaths` draws each shuttle's flight time as a text gauge against the longest, on every surface.
- Element keys: `shuttle-clock-<id>`, `fold-clock-<id>`, `held-clock`, `jump-clock`, `band-loader`, `load-<title>`, `load-<id>`, `deck-<deck>`, `shuttle-<id>`, `fold-<key>`, `log-more`, `log-less`.

## 8. Force field

### Types (`forcefield/risk.ts`)

```ts
export const RISK_GROUPS = ['delete', 'secrets', 'git-history', 'publish', 'infra', 'database'] as const
export type RiskGroup = (typeof RISK_GROUPS)[number]
export type Dir = string | null          // where an earlier cd moved; null: the session folder; '-': unknown (cd -)
export type Risk =
  | { kind: 'rm'; group: 'delete'; label: string; targets: string[]; dir: Dir }
  | { kind: 'find-delete'; group: 'delete'; label: string; args: string[]; dir: Dir }
  | { kind: 'git-clean'; group: 'delete'; label: string; args: string[]; dir: Dir }
  | HistoryRewrite<'git-reset'> | HistoryRewrite<'git-checkout'> | HistoryRewrite<'git-push-force'>   // { kind; group: 'git-history'; label; args; dir }
  | { kind: 'git-branch-delete'; group: 'git-history'; label: string; branches: string[]; dir: Dir }
  | { kind: 'git-stash'; group: 'git-history'; label: string; which: 'drop' | 'clear'; ref: string; dir: Dir }
  | { kind: 'migrate'; group: 'database'; label: string; tool: 'alembic' | 'rails' | 'prisma' | 'django' | 'unknown'; dir: Dir }
  | { kind: 'unmeasured'; group: Exclude<RiskGroup, 'secrets'>; label: string; summary: string; note: string; dir: Dir }
export type Measure = { summary: string; lines: string[]; more: number; note: string }
export type RiskOf<K extends Risk['kind']> = Extract<Risk, { kind: K }>
export type Held = Measure & { headline: string; who: string; since: number | null; mode: 'hold' | 'block'; directive: string }
export type HoldDraft = Omit<Held, 'who'>
export type ActiveHold = Held & { since: number }
export function isActiveHold(held: Held): held is ActiveHold
// process.ts: SCRIPT_NAME, MEASURE_TIMEOUT_MS, REF_TIMEOUT_MS, LOOKUP_TIMEOUT_MS, ERROR_MAX, nonEmptyLines
// measure/result.ts: LIST_MAX, plainMeasure, listMeasure
```

Each classifier sets `group` itself, replacing today's label regex `groupOf`. The mapping must equal today's: `rm`, `find -delete`, `find -exec rm`, `xargs rm` and `git clean` are `delete`; other git kinds are `git-history`; migrations, `db:drop/reset/schema:load` and destructive SQL are `database`; docker/podman/compose/kubectl/helm/terraform/tofu are `infra`; the rest are `publish`. The step-1 characterization test pins this. Kind `other` becomes `unmeasured` (internal only).

### Classification

```ts
// shell.ts
export function stripHeredocs(command: string): string
export function maskQuotes(command: string): string
export function segmentsOf(command: string): string[]          // && || |& ; | a lone & and newline; also used by directiveFor (finding 21)
export function tokenize(text: string): string[]
export function commandWords(segment: string): string[]        // brackets, VAR=, sudo and its value options, command/exec/env/nohup/time/then/do/else/!, nice, then eval or a shell given a script
// classifiers/index.ts
export type Segment = { readonly program: string; readonly args: readonly string[]; readonly words: readonly string[] }
export type Classifier = (segment: Segment, dir: Dir) => Risk | null
export const CLASSIFIERS: ReadonlyMap<string, Classifier>      // rm, find, xargs, git, docker, podman, docker-compose, kubectl, helm, terraform, tofu, npm, yarn, pnpm, bun, cargo, gem, twine, poetry, gh, glab
export const WORD_RULES: readonly Classifier[]                 // run when the table gives null: db:drop, alembic, db:migrate, prisma, manage.py, bare migrate
// classify.ts
export function classifyAll(command: string): Risk[]
export function classify(command: string): Risk | null
// classifiers/database.ts
export function destructiveSql(raw: string): Risk | null       // checked on the raw line first, only with a database client
// secrets.ts
export function secretFileOf(tool: string, input: unknown): string | null
```

- `classifyAll` keeps today's order: destructive SQL first, then each segment of the masked, heredoc-free line. `cd`, `pushd` and `popd` move `dir` (with the pushd stack and subshell scopes) and are not risks. The loop variable is `raw` (finding 33): `Segment` is the parsed object.
- The program is the first word with a leading `\` removed; only `rm` also matches by path (`/bin/rm`), as today. `READ_ONLY` keeps a bare `migrate` word in `ls`, `git`, `grep` and the like from counting.
- A script is read as commands. `maskQuotes` unquotes the text `eval`, a shell given `-c` (or `-lc`, `-ec`) or a shell's `<<<` runs, past sudo, env, nohup, nice and `xargs`; a double-quoted script is unescaped as bash does. A new shell's script sits between `SCRIPT_START` and `SCRIPT_END` marker segments: `classifyAll` saves its scope at the start and restores it at the end, so no `cd` or bracket inside it moves the line, and a command's own marker characters are blanked first. `eval`'s script runs in place. A shell's flag sets take one value per `o` (`-euo pipefail`), and a `-c` after misread options still counts. `stripHeredocs` keeps a body a shell reads (`bash <<EOF`, `cat <<EOF | sh`) between the same markers. `<<<` and a `<<` inside quotes open no here-document; an escaped quote opens no quotes.
- Secrets are not a Bash classifier: `secretFileOf` reads any tool's path or a Bash command and adds group `secrets`.

### Directives

```ts
export type DirectiveMode = 'pass' | 'hold' | 'block'
export type Directive = { mode: DirectiveMode; target: string; source: string }   // target: '@group' or a command, '*' globs
export type DirectiveSet = { directives: Directive[]; errors: string[] }
export const DIRECTIVES_FILE = '.claude/skywatch.directives'
export const DEFAULT_DIRECTIVES: readonly Directive[]    // pass @delete; hold the other five groups
export function parseDirectives(text: string, source: string): DirectiveSet
export function directiveFor(directives: readonly Directive[], groups: readonly RiskGroup[], command: string): Directive | null
export function directiveLine(directive: Directive): string     // 'hold @delete'
export function directivesReport(set: DirectiveSet): string     // the /skywatch directives text, unchanged
export async function loadDirectives($: EngineInterface): Promise<DirectiveSet>   // load.ts
```

### Holding and measuring

```ts
// hold.ts
export async function holdFor($: EngineInterface, call: { tool: string; input: unknown }, directives: readonly Directive[]): Promise<HoldDraft | null>
export function headlineOf(risks: readonly Risk[]): string
// verdict.ts
export function gateVerdict<V extends { decision: CheckDecision; reason?: string }>(found: V, held: Held | undefined): { verdict: V; blockedBy: string | null }
// folders.ts
export async function resolveDir($: EngineInterface, sessionCwd: string, dir: string): Promise<string | null>
export async function isTempOnly($: EngineInterface, risks: readonly Risk[], sessionCwd: string): Promise<boolean>
export function allUnder(roots: readonly string[], paths: readonly string[]): boolean
// measure/index.ts
export async function measure($: EngineInterface, risk: Risk, cwd: string): Promise<Measure>
```

- `holdFor` classifies once and passes the risks on (finding 28), computes `describeInput` once (finding 29), and keeps today's rules: `pass` or no directive gives null; `block`, or a match with no command risk, needs no measure; a temp-only `rm` gives null unless the directive names the command or a secret file is involved; otherwise measure the first risk where the command runs (session folder moved by `cd`/`git -C`), refusing to run git outside the session folder.
- `measure` switches on `risk.kind` (a table of `$` functions does not load). Each measurer is a `function` declaration; output parsing is a pure exported function tested on its own. Every `$.process.run` uses a named timeout. Count words use `plural` (finding 20); bytes use `fmtBytes` (finding 34); the push measurer reads `HEAD` once for an empty or `HEAD` branch (finding 22).
- Files ported from `forcefield.mjs` keep its three-line Apache-2.0 header. The git `-c` flags, the "paths passed as arguments, never as source" rule, the heredoc rule and the unmeasured-migration rule keep a one-line why-comment each; nothing else is commented.

## 9. Constants, theme and types

- **Domain constants sit with the code that uses them**, named in `SCREAMING_SNAKE_CASE`: list caps in their reducer's file (`BLACKBOX_MAX = 200`, `SHUTTLES_MAX = 24`, `TRANSMISSIONS_MAX = 40`, `COUNCIL_IDS_MAX = 40`, `SEEN_MAX = 60`, `PROBES_MAX = 60`, `ROSTER_MAX = 20`, `UNFOLDED_MAX = 30`, `RECENT_CHECKS_MAX = 80`, `TOOL_NOTES_MAX = 3`, `HISTORY_MAX = 12`), thresholds (`COMPACTION_MIN_TOKENS = 20_000`, `PROBE_ACTIVE_MS = 15_000`, `COST_EPSILON = 0.005`), and every `shorten` width as a named constant in its file. A constant two layers share goes in the lower one (`BLACKBOX_PAGE` in `domain/blackbox.ts`). There is no `limits.ts`.
- **Pane geometry** (`PANE_COLUMNS = 66`, `PANE_ROWS = 8`) is in `events/status.ts`; widths drawn by the UI (`LABEL_WIDTH = 12`, `GAUGE_WIDTH = 10`, `PANE_MIN_WIDTH = 40`, black box columns, loader widths) are in `ui/metrics.ts` or the module that uses them. The black box time column is `fmtClock(0).length + 1`.
- **Colours**: `ui/palette.ts` holds the presets, each a `Space` of eight steps and the `Colors` roles drawn from it; `ui/theme.ts` holds the status tables, which name roles. `ui/hazard.ts` colours the scale from a palette's space (finding 24). Widths and hotkeys live in `ui/metrics.ts`. Nothing below `ui/` names a colour.
- **Types**: persisted shapes and their unions in `types/index.d.ts` only. Non-persisted types with their owner, exported from its barrel: `Config`, `Module` (`core/config.ts`); `UsageReading`, `StepUsage`, `PaneActions` (`domain/`); `Risk`, `Held`, `Measure`, `DirectiveSet` (`forcefield/`); `UiContext`, `PaneData` (`ui/context.ts`); `Runtime` (`events/runtime.ts`). Closed sets are `as const` arrays typed against the contract's union (`DECKS satisfies readonly Deck[]`).
- **Guards instead of casts**: `isOneOf`, `isDeck`, `isHazardMode`, `handbackMessage(call: unknown): string | null` (finding 39), `serverBlocksOf(content: unknown): ServerBlock[]` for `session.append`. No `as unknown as`.

## 10. Tooling

| File | Holds |
| --- | --- |
| `package.json` | scripts below; devDependencies `@biomejs/biome` 2.6.2, `typescript` 7.0.2 |
| `biome.json` | as today; in step 10 `noNonNullAssertion` becomes `error` |
| `claude-code/tsconfig.json` | unchanged; the engine tsconfig is already strict with `noUncheckedIndexedAccess` and includes `src` and `tests` |
| `scripts/validate-snapshot.sh` | runs `claude plugin validate claude-code --json` (fails if it fails) and prints, for the hooks entry, each note with the module path prefix removed, ` (via …)` removed, and each comma list sorted; the output is sorted |
| `scripts/validate-baseline.txt` | that output before the refactor; changed only in the commits that move a client module or rename the entry, and only on those lines |

Scripts:

```
format      biome format --write .
lint        biome lint .
typecheck   tsc -p claude-code
check       biome check . && tsc -p claude-code
test        claude plugin test claude-code
validate    sh scripts/validate-snapshot.sh | diff scripts/validate-baseline.txt -
```

Type-checking needs `.claude-plugin/types/`, written when the mod loads (`claude --plugin-dir ./claude-code`).

## 11. Tests

- Pure tests import the barrels (`../../src/core`) and use plain values. Event and UI tests go through the kit.
- `tests/support/world.ts`: `world(on, { now?, files?, run?, usage?, statuses? })` answers clock, store, `ui.open/close/status/invalidate`, `command.register`, `session.start/end/measure/id/cwd/usage`, `fs.read` (absolute paths exactly; relative paths only for the project) and `process.run`. `shellAnswer` fakes the force field's scripts (rm counts, folders, temp roots), `PROJECT_DIRECTIVES` names the project's directives file, and `runTools(on, fails?)` runs the calls the mod lets through.
- `tests/support/drive.ts`: typed kit inputs, `START`, `slashCommand()`, `skywatch()`, `spawn()`, `complete()`, `measured()`, `sessionEnd()`, `assistantRow()`, `paneRequest()`, `bandRequest()`, `hintRequest()`, `modeRequest()`; `heldTexts()` makes a call and reads the pane while its prompt is up.
- `tests/support/fixtures.ts`: `STORED`, older and broken values for all 13 keys; every one must read with every field of its default's type.
- `tests/support/corpus/` and the generated `golden.ts` (`sh scripts/golden.sh`): the pre-refactor outputs every pure function must still give.
- Holds are read from the pane inside a `classic.PermissionRequest` hook, since the kit's own `$` cannot call `session.cwd`.

## 12. Migration order

Each step is one commit or a short series. After every commit: the mod loads, `npm run validate` shows no diff (except the planned baseline lines), `npm test` passes, and the type-error count does not rise (20 today; 0 at the end). Refactors and behaviour fixes are separate commits.

0. **Tooling** (`chore:`): `scripts/validate-snapshot.sh`, `validate-baseline.txt` from the current code, `validate` script.
1. **Characterization tests** (`test:`): section 11 item 1; delete `tests/smoke.test.ts`.
2. **`src/core/`** (`refactor:`): move generic helpers out of `hooks/core.ts`; `core.ts` re-exports them for now. One `capitalize` (finding 14). `hooks/clock.tsx` imports `fmtTimer` from `../src/core` and drops its copy (finding 15).
3. **Contract and `src/domain/`**: tighten `types/index.d.ts` (section 5) with `defaults.ts` and `normalize.ts`; move every reducer out of `core.ts` and the reducers inlined in `starbase.tsx` (`usageFrom`, `withShuttle`, `afterCall`, `jumpCost`, …). `starbase.tsx` imports `src/domain`; delete `core.ts`.
4. **`src/forcefield/`** in TypeScript: shell, classifiers, classify, secrets, directives, verdict, folders, load, measure, hold. `starbase.tsx` calls `holdFor`, `loadDirectives`, `gateVerdict`; delete `forcefield.mjs`. The calls list keeps `$.fs.read`, `$.process.run`, `$.session.cwd`.
5. **`src/state/`**: `atoms.ts` and the action files; `starbase.tsx` keeps no `atom`, `read` or `update`. State reads and writes still list all 13 keys.
6. **`src/events/`**: `runtime.ts` replaces the module globals; move one family per commit (`session`, `command`, `agents`, `jumps`, `tools`) and call its `register…` from `starbase.tsx`'s `register`. `starbase.tsx` is left with the four `ui.render` hooks.
7. **`src/ui/`**: `theme`, `hazard`, `context`, `layout`, `widgets`; move `clock.tsx` and `loader.tsx` to `src/ui/clients/` with their `Client` literals in the same commit (baseline: surface-module lines); then one module per commit into `ui/modules/`, then `pane`, `viewscreen`, `beacon`, and `events/render.tsx`.
8. **Entry**: `hooks/skywatch.ts` and `hooks.json` in one commit; delete `starbase.tsx`. The snapshot is unchanged (module paths are stripped).
9. **Fixes** (`fix:`, one commit each, each with a test): deck counts include `blocked` via `tallyTotal` (finding 1); black box fold key is `foldKey(entry)` = `log-<at>-<who>` (finding 3); `endTransmission` uses `adviceLine` (finding 16; this changes the advice text for reports whose first line starts with `[` or `<`, or holds `**`/`__`).
10. **Tighten and document** (`chore:`/`docs:`): zero type errors, `noNonNullAssertion: error`, every file under 300 lines (`wc -l`), README "How it works" table, both AGENTS.md files (section 1 rules into `claude-code/AGENTS.md`), delete `docs/architecture-draft.md`.

## 13. Findings and where they land

| # | Resolved by |
| --- | --- |
| 1 | `domain/shields.ts` `tallyTotal`, used by `shieldsSummary` and the deck buttons in `ui/modules/shields.tsx` (step 9) |
| 2 | `DEFAULT_SHIELDS.held` in `domain/defaults.ts`, `normalizeShields`; `held` required in the contract; no `?? 0` readers |
| 3 | `domain/blackbox.ts` `foldKey`, used by `ui/modules/blackbox.tsx` (step 9) |
| 4 | `events/runtime.ts` `Runtime`, created in `registerHooks` |
| 5 | split into `src/state`, `src/events`, `src/ui` (tree) |
| 6 | split into `src/core` and `src/domain` |
| 7 | `hooks/` holds only `hooks.json` and `skywatch.ts`; clients in `src/ui/clients/` |
| 8 | `forcefield/classify.ts` + `classifiers/` vs `forcefield/measure/` |
| 9 | `shell.ts` `commandWords`; `classifiers/index.ts` `CLASSIFIERS` table, one function per tool |
| 10 | gone in the TypeScript port |
| 11 | `claude-code/tests/` (section 11) |
| 12 | `state/atoms.ts` `get<Key>`/`patch<Key>` |
| 13 | `domain/fleet.ts` `withShuttle` with `patchShuttles` |
| 14 | `core/text.ts` `capitalize` |
| 15 | `ui/clients/clock.tsx` imports `fmtTimer` from `core` |
| 16 | `state/council.ts` `endTransmission` calls `domain/council.ts` `adviceLine` (step 9) |
| 17 | `domain/usage.ts` `usageFrom`, used by `session.start` and `recordUsage` |
| 18 | `ui/frame.tsx` `ModuleFrame` in every module |
| 19 | `ui/widgets.tsx` `Bar` in viewscreen and pane |
| 20 | `core/text.ts` `plural(n, word, many?)` in measures (`stash`/`stashes`) |
| 21 | `forcefield/shell.ts` `segmentsOf`, used by `classify.ts` and `directives.ts` |
| 22 | `forcefield/measure/git.ts` `measurePush`: one `HEAD` lookup |
| 23 | `domain/fleet.ts` `applyStep` calls `stepTokens` |
| 24 | `ui/hazard.ts` builds `HAZARD_SCALE` from `SPACE` |
| 25 | `ui/theme.ts` `VERDICT_STYLE` |
| 26 | `ui/theme.ts` `SHUTTLE_STATUS` |
| 27 | `ui/modules/index.ts` `MODULE_VIEWS` |
| 28 | `forcefield/hold.ts` classifies once |
| 29 | `forcefield/hold.ts` describes the call once |
| 30 | `ui/modules/parts/flight-paths.tsx` `FlightPaths` with the resolved `Svg` |
| 31 | names: `council`, `shields`, `jump`, `bridge`, `lastJump`, `view`, `usage`, `probe`, `entry`, `totals`, `COLORS`; no shadowing |
| 32 | shuttle/fleet only (`ShuttleCard`, `jump-clock`); `jumps.ts`; no "architect" banner |
| 33 | `classify.ts` loop variable `raw` |
| 34 | `core/format.ts` `fmtBytes` |
| 35 | TypeScript port; Biome formats everything |
| 36 | contract `Deck`; `DeckName` removed |
| 37 | contract `HazardMode`, used by `View.hazards` and `Config` |
| 38 | section 9 type locations |
| 39 | `domain/calls.ts` `handbackMessage` |
| 40 | one doc block per declaration in the contract and the port |
| 41 | comments only for the why-list in section 8 and the Apache header |
| 42 | no banners |
| 43 | `ui/pane.tsx` maps with an expression body |
| 44 | no banners |
| 45 | named constants (section 9); `ModuleFrame` measures its note |
| 46 | no aliases (`motion`, `C`, `body`, `isReview`, `open` removed) |
| 47 | `noteAdvice($, advice)`, `isCouncilType($, type)` |
| 48 | barrels; one import per folder |
| 49 | `core/format.ts` `fmtAgo`, `fmtSpeed`; `domain/bridge.ts` `EFFORTS`, `effortPct`; `Effort` uses `GAUGE_WIDTH` |
| 50 | `ui/modules/council.tsx` writes the moments `Box` without braces |

## 14. Changes from the draft

- **State access rebuilt.** The draft's single atom, `readerOf`/`writerOf` and generic `update(key, …)` cannot load: atoms must be declared in the file that reads and writes them, by literal ref. Now 13 atoms and per-key `get`/`patch` in `state/atoms.ts`; the 13 keys stay.
- **No HookContext, `bind`, `HookIo` or fake test context.** `$` must be spelled literally and cannot travel in an object or table. Handlers pass `$` to named functions; tests use the kit with answered nouns.
- **Tables of `$` functions replaced by `switch`** (`SUBCOMMANDS`, `SURFACE_RENDERERS`, `MEASURE_PLANNERS`).
- **Group names corrected**: `delete, secrets, git-history, publish, infra, database` (draft: `git, cluster, release, secret`). The `Risk` union follows the real kinds; `git clean` is `delete`; secrets come from any tool, not a Bash classifier.
- **Directive shape corrected**: `{ mode, target, source }` plus a list of unread lines, as stored and reported today.
- **Held call and directives stay in memory** (the `Runtime`), not in state: the pane shows them, but a new key would change the contract.
- **Measures stay imperative.** Push, branch and stash measures run dependent steps; the draft's declarative `MeasurePlan` does not fit. Pure output readers are split out instead. The temp-folder check is a shell `pwd -P` run, not path math.
- **Layout**: code in `src/` (an engine tsconfig root) with a one-file entry, not everything under `hooks/`. Six layer folders instead of fourteen domain folders; no per-module `view.ts` selectors, `kit.ts`, `env.ts`, `io/`, `hazard/`, `commands/`, `config/` or `calls/` folders.
- **Client modules** may import pure files (verified); the clock uses `core`'s `fmtTimer`. Paths are `./clients/…` from `ui/widgets.tsx`.
- **Contract location**: `PluginState` is merged in `declare module 'claude-code'`; code imports types from `types/`.
- **Tooling trimmed**: no root `tsconfig.json` (the engine's is already strict), no `.editorconfig`, no `check-layers.sh`; one validate snapshot script whose comparison sorts lists, since hook registration order changes.
- **Removed invented behaviour**: no throttled stream writes in `turn.step`; the SessionMode render only reads the mode labels (it never shows the beacon).
- **Open points closed**: validate ignores `tests/`; nested test folders run; element and API type names are `EngineInterface`, `On`, `Register`, `Args<E>`, `ElementTable`, `RenderNode`, `RenderChildren`, `ClientModule`.

## 15. As built

What the implementation settled differently from sections 4 to 13, after the conformance review (`docs/reviews/01-conformance.md`):

- **UI files.** `TitleRow` and `ModuleFrame` live in `ui/frame.tsx`, since `widgets.tsx` needs `Sep` from `layout.tsx` and `TitleRow` needs `Connector`. `layout.tsx` adds `Blank`, `Stack` (an `items` prop) and `Frame`, which shuttle cards use. `EffortBar` became `Effort` (the bar, the word and the separator). The held call is typed `ActiveHold`.
- **Domain names.** Transmission reducers are `openTransmission`/`closeTransmission` (state keeps `start`/`endTransmission`). `foldKey` became `keyedEntries`: keys are `log-<at>-<who>`, with a count for repeats, oldest first. Named reducers replace call-site spreads: `withCommand`, `startRunning`, `endRunning`, `withMode`, `withPromptAt`, `withReviewing`, `withAdvice`, `withHazards`, `usageAfterReset`.
- **Force field.** `CLASSIFIERS` is a `Map`, so `__proto__` or `toString` never match a program. Shared process details live in `process.ts`, measure builders in `measure/result.ts`, `joinDir` in `shell.ts`.
- **Events.** `turn.complete` splits into `completeBridgeJump`, `completeAgent` (council, shuttle or probe) and `completeShuttle`.
- **Tests.** Section 11's `fixtures.ts` holds `STORED` for all 13 keys; inputs live in `tests/support/corpus/` and their pre-refactor outputs in the generated `golden.ts` (`scripts/golden.sh`). `drive.ts` builds typed kit inputs. The test kit's `$` has no `session.cwd`, so holds are read from the pane inside a `classic.PermissionRequest` hook.
- **Behaviour fixes**, beyond findings 1, 3 and 16: a bare `/skywatch` launches (the old code read `''` as a verb); a `cd` folder carries past an earlier risk on the same line; stored checks with an unknown verdict read as stopped, shuttles with an unknown status as stopped.
- **Accepted:** when the 200-entry cap drops the oldest of two entries with the same time and writer, the newer one's fold key shifts once.
- **After review round 1** (`docs/reviews/02-review-round-1.md`): `callerOf` is gone (`tool.check` carries `agentId`); bookkeeping in the tool hooks runs through `bestEffort`; `surface.ts` became `status.ts`, `command.ts` `commands.ts`, layout's `Frame` `Border`; UI widths and hotkeys moved to `metrics.ts`; `ActiveHold` lives in the force field; `mergeDefaults` takes a stored field only when it has its default's type. The classifier splits at a lone `&` and `|&`, and skips the options of `env` and `time`.
- **After review round 2** (`docs/reviews/03-review-round-2.md`): `listOf` returns `unknown[]` and every stored list is read item by item (`isString`, `isNumber`, or a default per item), and shield totals keep only known decks; the black box's writers are `WRITERS` in `domain/blackbox.ts`; `whoIs` never fails, so a held call always keeps its hold; `costSince`, `withShuttleCall`, classify's `Effect` (was `Step`); `ui/modules/parts/` has a barrel; tests share `shellAnswer` and `PROJECT_DIRECTIVES`. Declared changes: a `.env` file a PowerShell command names reads "touch" (was "change"), as for Bash; the running jump's clock key is `jump-clock` (was `turn-clock`).
- **After review round 3** (`docs/reviews/04-review-round-3.md`): `mergeDefaults` takes a guard per null-default field, so a stored cost, time, speed or text of the wrong type reads as null; `statusOf` and `checkVerdict` fall back to `failed` and `deny` for a reason or decision a newer engine adds; tool.check stamps the held call's wait through `bestEffort`; `shuttleWriter` names a shuttle in the black box; `baseName` lives in `core/text.ts`. `docs/architecture-draft.md` stays, marked superseded, although §12 step 10 planned its deletion. Declared change: a shuttle's spawn entry is written under the same name as its later entries (cut at 14 characters, was 12).
- **Parser gaps, after an automated security review** (both inherited from `forcefield.mjs`): a here-document body was dropped even when a shell ran it, and `<<<` or a quoted `<<` opened one, hiding the lines after it; a script was unquoted only for a bare `bash -c` or `eval`, so `bash -lc`, `sudo sh -c`, `env bash -c` and `xargs sh -c` hid their commands, and a script with no separator was never read. Declared changes: `bash -c "rm -rf build"` and `eval "rm -rf build"` are now risks (the corpus's `RUN_AS_CODE`, kept out of the golden comparison); quoted text a script runs is masked as `;START;…;END;` with the script markers (`;…;` for `eval`). A second automated review of that fix found three gaps in it, fixed in the next commit: double-quoted escapes, `-euo pipefail` flag sets, and brackets inside a script closing its scope early. Still not read: a here-document or `-c` script given to another interpreter (`python <<EOF`, `node -e`), whose body is not shell.
