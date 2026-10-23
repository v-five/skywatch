# Review 01: conformance of the SkyWatch refactor

Scope: the whole uncommitted working tree against `HEAD` (`39dcedb`). Read in full: every file under `claude-code/src`, `claude-code/hooks`, `claude-code/types`, `claude-code/tests`, `scripts/`, the root config and docs, and the pre-refactor `starbase.tsx`, `core.ts`, `forcefield.mjs`, `clock.tsx`, `loader.tsx` and `types/index.d.ts`. Paths below are relative to the repo root unless they start with `src/`, `tests/`, `types/` or `hooks/` (those are under `claude-code/`).

## Tool results

| Check | Result |
| --- | --- |
| `npm run check` (Biome + tsc) | clean: 118 files, 0 diagnostics, 0 type errors |
| `npm test` | 201 pass, 0 fail, 25 files |
| `npm run validate` | no diff against `scripts/validate-baseline.txt` |
| Snapshot of the pre-refactor tree (`git archive HEAD`, same script) vs the baseline | identical apart from the planned `surface modules:` line (`hooks/clock.tsx, hooks/loader.tsx` became `src/ui/clients/…`) |
| `wc -l` | largest file `src/events/jumps.ts` 163 lines; nothing over 300 |
| Layer imports (`rg`) | no upward import; `ui/` takes only `type Held` from `forcefield/`; no `import()`, `require`, `node:` or DOM; `Client` tags only in `src/ui/widgets.tsx` |

## Summary

| Severity | Count |
| --- | --- |
| bug | 4 |
| plan-deviation | 15 |
| convention | 17 |
| nit | 14 |
| **total** | **50** |

Of the 50 review findings, 41 are fully resolved and 9 only partly (9, 12, 20, 24, 32, 41, 45, 46, 48); none is untouched. All 5 declared behaviour fixes are in and tested. The 7 declared deviations are sound, but two need a follow-up: the draft needs a "superseded" marker, and the golden file needs its generator committed (see "Declared deviations").

The five that matter most:

1. **B1** `claude-code/LICENSE` was cut down to one line. The MIT text and Stephen Casella's copyright are gone from the folder that ships.
2. **B2** The `CLASSIFIERS` table is a plain object, so `Object.prototype` names match as programs. A Bash command starting with `__proto__` throws inside `tool.call`, and `toString`, `constructor` or `valueOf` put non-`Risk` values into the risk list. Verified by running `classifyAll`.
3. **P1** Nothing is committed. Plan §12 asks for one commit (or a short series) per step, with each behaviour fix in its own `fix:` commit with a test.
4. **B3** `VERDICT_STYLE[check.verdict]` crashes the whole pane render on a stored check whose verdict is outside the union. `normalizeShields` does not narrow `recent`, and the old ternary chain fell back to "stopped".
5. **P2** `docs/architecture.md` does not describe what was built. `frame.tsx`, `keyedEntries`, `Stack`/`Blank`/`Frame`, `Effort`, the corpus/golden test kit, `classifiers/types.ts`, `completeAgent` and several new helpers are missing from the "final architecture".

---

## Bugs

### B1 · bug · `claude-code/LICENSE:1`
**What:** The working tree reduces the shipped license to a single line, `Copyright (c) 2026 v-five`. The MIT grant and `Copyright (c) 2026 Stephen Casella` were deleted. The root `LICENSE` still has both. MIT requires the notice in every copy, and `claude-code/` is the folder that ships (`marketplace.json` `source: ./claude-code`). The plan lists `claude-code/LICENSE` without any change.
**Fix:** `git checkout HEAD -- claude-code/LICENSE`, or make it a copy of the root `LICENSE`.

### B2 · bug · `src/forcefield/classify.ts:36`, `src/forcefield/classifiers/index.ts:12`
**What:** `CLASSIFIERS[segment.program]?.(segment, scope.dir)` looks up an object literal, so `Object.prototype` members match. I ran the module under Node:

| Command | Result |
| --- | --- |
| `__proto__` | throws `CLASSIFIERS[segment.program] is not a function` |
| `toString` | returns `["[object Object]"]` |
| `constructor x` | returns the Segment object |
| `valueOf` | returns `[{}]` |

A throw in `holdFor` fails the `tool.call` hook, which has no `.catch`. A non-`Risk` value has no `group`. Under a command or glob directive such as `hold *`, `measureFirst` then reads `risk.kind.startsWith`, and the held call reads `undefined (could not measure it)`. The old `if (cmd === …)` chain had neither problem.
**Fix:** Look up only own keys: `Object.hasOwn(CLASSIFIERS, program) ? CLASSIFIERS[program] : undefined`. Alternatively, build the table as a `ReadonlyMap<string, Classifier>`. Add `__proto__`, `toString` and `constructor x` to `tests/support/corpus/shell.ts`, expecting `[]`.

### B3 · bug · `src/ui/modules/shields.tsx:23,98,99`, `src/domain/normalize.ts:64`
**What:** `VERDICT_STYLE[check.verdict].color` and `.word` throw when a stored check carries a verdict outside the union, and the throw fails the whole Pane render. The old `verdictColor` and word chains fell back to `C.stopped` and `'stopped'`. `normalizeShields` keeps `recent` as `listOf<Check>` without narrowing `verdict` or `deck`. Only older or corrupt state can trigger it, but the pre-refactor code survived that state.
**Fix:** In `normalizeShields`, keep only checks whose `verdict` passes `isOneOf(VERDICTS, …)` and whose `deck` passes `isDeck`, or map unknown verdicts to `deny`. Add a case to `STORED.shields`.

### B4 · bug (low) · `src/ui/theme.ts:53,58`
**What:** `WRITER_COLOR[entry.who] ?? COLORS.shuttles` looks up a plain object. For a writer named `constructor`, `toString` or `valueOf`, it returns a function as the colour. Shuttle writers come from `shorten(description || type, 14)`, so a shuttle described as "constructor" is enough. The old ternary chain could not do this.
**Fix:** `Object.hasOwn(WRITER_COLOR, entry.who) ? WRITER_COLOR[entry.who] : COLORS.shuttles`, or use a `Map`.

---

## Plan deviations

### P1 · plan-deviation · whole working tree
**What:** The entire refactor is one uncommitted change set. Plan §12 asks for:
- one commit (or a short series) per step 0 to 10;
- `npm run validate` and `npm test` after each;
- refactors separate from behaviour fixes;
- each fix in its own `fix:` commit with a test (findings 1, 3 and 16, plus the bare `/skywatch` and `cd` carry fixes).

`docs/conventions.md` (Git) repeats the last two. In its current form, a reviewer cannot bisect, and the fixes cannot be reverted alone.
**Fix:** Stage it as the plan's series, using `git add -p` per folder:
1. `chore:` tooling;
2. `test:` corpus and golden;
3. `refactor:` core, domain, forcefield, state, events, ui and entry;
4. one `fix:` per behaviour fix, each with its test;
5. `docs:`.

### P2 · plan-deviation · `docs/architecture.md` §3, §7, §11, §13
**What:** The "final architecture" no longer matches the code. Missing or different:

| Area | In the plan | In the code |
| --- | --- | --- |
| UI files | `ModuleFrame` in `ui/layout.tsx` | `src/ui/frame.tsx` (`TitleRow`, `ModuleFrame`) |
| Layout | `Row`, `RowBlock`, `Sep`, `Ruler`, `ModuleFrame` | `layout.tsx` also holds `Blank`, `Stack`, `Frame` |
| Widgets | `EffortBar` | `Effort` (draws the label and separator too); `Connector` takes `ui` instead of `els/hasClient/dim/marks/isMerge` |
| Context | `Held` | `ActiveHold` in `ui/context.ts` |
| Domain | `start/endTransmission`, `foldKey`, `visibleEntries`, `newEntry` | `openTransmission`/`closeTransmission`, `keyedEntries`; `newEntry` missing |
| Domain helpers | not listed | `withCompaction`, `lastDelta`, `withJumpTokens`, `withRequestTokens`, `withActiveTime`, `activeTime`, `shownShuttles`, `statusOf`, `hasPendingAsk`, `latestTransmission`, `hasCouncil`, `isOpenTransmission`, `effortLevel`, `isEffort` |
| State helpers | not listed | `followSession`, `readUsage`, `contextNow`; events `readBeacon`, `hasBlockDirective` |
| Forcefield | not listed | `classifiers/types.ts` (`Segment`, `Classifier`, `isFlag`); `risk.ts` also holds `joinDir`, `unmeasured`, `plainMeasure`, `listMeasure` |
| Events | `completeTransmission`, `completeShuttle`, `completeProbe` | `completeAgent` |
| Tests | `fixtures.ts` | `corpus/`, `golden.ts`, `pane.ts`; `WorldOptions` has `usage` but no `sessionId`/`cwd` |
| Barrel | `ui/index.ts` exports Pane, Viewscreen, beaconText, types | also exports `COLORS`, `hazardOf`, `ringOf` |
| Guards | `stringOr`, `numberOr` | `stringOf` |
| Bridge | `withSpeed` in `domain/bridge.ts` | in `domain/usage.ts` |

**Fix:** Update the tree in §3, the signatures in §7 and §8, §11 and the §13 rows (3, 18, 41). Add a short "Changes from the plan" list mirroring the declared deviations.

### P3 · plan-deviation · `docs/architecture-draft.md:1`
**What:** §12 step 10 says to delete it. Keeping it as a record was declared. But nothing marks it as superseded, and `AGENTS.md` lists it beside the final document. It still prescribes designs that §14 says cannot load, such as "all mod source stays under `claude-code/hooks/`", `readerOf`/`writerOf` and one atom.
**Fix:** Add a first line, `> Superseded by [architecture.md](architecture.md); kept as a record. Do not follow.`, or move the file to `docs/archive/`.

### P4 · plan-deviation · `claude-code/.claude-plugin/plugin.json:48`
**What:** Biome reformatted the `options` array onto one line, but the plan marks the manifest "(unchanged)". The change is harmless, but it is an unplanned diff in the shipped manifest.
**Fix:** Either add `!claude-code/.claude-plugin/plugin.json` to `biome.json` `files.includes` and restore the file, or note it in §3.

### P5 · plan-deviation · `claude-code/README.md:160,162-170`
**What:** The plan says only the "How it works" table changes. The diff also adds `claude plugin test .` and a docs link, which is fine. The new table row says `tests/` holds "tests for every layer", but there is no `tests/state/`. For events, only command, agents and the force field are covered; `session.*`, `turn.*` and the non-force-field `tool.call` paths are not.
**Fix:** Change the row to "tests for core, domain, force field, UI and the main hook flows", or add state and jump tests.

### P6 · plan-deviation · `src/domain/defaults.ts:19`, `src/state/log.ts:18`
**What:** §9 puts `BLACKBOX_PAGE` in `domain/blackbox.ts`, but it is in `defaults.ts`. §3 lists `newEntry` in `domain/blackbox.ts`, but entries are built inline in `logEntry`.
**Fix:** Move `BLACKBOX_PAGE` to `blackbox.ts` and import it from `defaults.ts`. Add `newEntry(at, who, text, kind, agentId)` and use it in `logEntry`.

### P7 · plan-deviation · `src/events/jumps.ts:112-129`
**What:** §6 splits `turn.complete` into `completeBridgeJump`, `completeTransmission`, `completeShuttle` and `completeProbe`. The code has `completeBridgeJump` and one `completeAgent` that holds the other three branches. It is still under 50 lines.
**Fix:** Split as planned, or record the merge in §6.

### P8 · plan-deviation · `src/events/render.tsx:21`
**What:** §9 places `PANE_MIN_WIDTH = 40` in `ui/theme.ts` (or the UI module that uses it). It sits in `events/render.tsx`.
**Fix:** Export it from `src/ui/theme.ts`, through the `ui` barrel.

### P9 · plan-deviation · `src/domain/normalize.ts:84-86,96,108-110`
**What:** §5 says each normalizer "merges the stored object over its `DEFAULT_*`… narrows unions". Three do not:
- `normalizeProbes` is `listOf<Probe>` with no per-item defaults.
- `normalizeLastJump` casts `stored as LastJump`, so `{}` reads as a LastJump with `durationMs` undefined and the viewscreen shows `NaN`.
- `normalizeEntry` casts `entry.cost as LineCost` without checking its fields.

Check verdicts and decks are not narrowed either (see B3).
**Fix:** Add `DEFAULT_PROBE` and `DEFAULT_LAST_JUMP` and merge per item. Validate `cost` with `mergeDefaults({ usd: null, tokIn: 0, tokOut: 0 }, …)`.

### P10 · plan-deviation · `tests/support/corpus/calls.ts:111-134`, `tests/domain/normalize.test.ts`
**What:** §11 asks for `tests/support/fixtures.ts`, with `STORED` typed per `PluginState['skywatch']` key and every key covered. The actual `STORED` differs:
- It is a `Record<string, …>`.
- It has key `shuttle` instead of `shuttles`.
- It has no `probes`, `lastJump`, `councilRoster` or `meta`.
- Only `STORED.shields` and `STORED.blackbox[2]` are read by any test; the `bridge`, `usage`, `council`, `shuttle`, `jump`, `view` and `totals` fixtures are dead.

**Fix:** Type `STORED` as planned, in its own file. In `normalize.test.ts`, assert for every key and every fixture that the normalized value has the full current shape.

### P11 · plan-deviation · `tests/events/forcefield.test.ts:34-41`, `tests/ui/viewscreen.test.tsx:15-21`, `tests/events/command.test.ts:42-55`
**What:** Three tests check less than §3 and §11 ask:
- The block test never checks that the force field counts one blocked, though §11 asks for it.
- The viewscreen test does not check the gauge cells or the "Last jump" text.
- The directives test checks parts of the text, not "exact texts".

**Fix:** In the block test, mount the pane and find `' blocked 1'`. Run a `turn.complete` before the band and assert `Last jump …`. Compare the whole directives report.

### P12 · plan-deviation · `tests/support/golden.ts:1`, `claude-code/AGENTS.md` (Tests)
**What:** The file says "Generated from the pre-refactor code (commit 39dcedb)… Do not edit by hand", and AGENTS.md says "it is generated, not edited". No generator is in the repo, so nobody can reproduce or extend the golden values. The `upTo: 1e9` stand-in for `Infinity`, the `"undefined"` stand-in and `other` instead of `unmeasured` are conventions of that missing script.
**Fix:** Commit the generator (for example `scripts/golden.mjs`, running the `HEAD` sources from `git archive` over `tests/support/corpus`) and give the command in `claude-code/AGENTS.md`.

### P13 · plan-deviation · comments in the force field (finding 41)
**What:** §8 says ported files keep the Apache header plus four one-line why-comments (git `-c`, paths as arguments, heredocs, unmeasured migrations), "nothing else is commented". These are extra:
- `src/forcefield/classify.ts:55`
- `src/forcefield/folders.ts:14-15`, two lines
- `src/forcefield/folders.ts:43`
- `src/forcefield/measure/refs.ts:13`
- `src/forcefield/hold.ts:38,81`

The git why-comment `src/forcefield/measure/git.ts:12-13` takes two lines.
**Fix:** Cut each to one line, or fold the reason into a name: `TEMP_SCRIPT` → `REAL_PATHS_SCRIPT`, `uniqueCommits` already says it. Keep only the four listed reasons.

### P14 · plan-deviation · `src/forcefield/risk.ts:1`
**What:** `joinDir` (lines 47-51) is ported from `forcefield.mjs:34-39`, Apache-2.0, but the file has no header. §8 says files ported from `forcefield.mjs` keep it.
**Fix:** Add the three-line header, or move `joinDir` into `classify.ts`, which has it (see C14).

### P15 · plan-deviation · inline reducers at call sites (finding 12, partial)
**What:** §5 says callers compose named pure reducers. Ad-hoc spreads remain:
- `src/events/session.ts:17` and `src/events/command.ts:51`: `{ ...bridge, command: null }`, duplicated
- `src/events/command.ts:64`
- `src/events/jumps.ts:56`: `isRunning: true`
- `src/events/jumps.ts:68`: `promptAt`
- `src/events/jumps.ts:103`: end of jump
- `src/events/command.ts:15`: hazards
- `src/state/council.ts:23,31`: `isReviewing`
- `src/state/council.ts:36`: `lastAdvice`
- `src/state/session.ts:39`: usage reset

**Fix:** Add domain reducers and use them: `withCommand(bridge, command)`, `startRunning`, `endRunning`, `withPromptAt`, `withReviewing`, `withHazards`, `withAdvice`, `usageAfterReset`.

---

## Convention violations

### C1 · convention · `src/ui/modules/shuttle-card.tsx:64-131`
**What:** `Readings` is 67 lines; the limit is 50 per function.
**Fix:** Split it into `CardGauges` (Helm, Fuel and the clock) and `CardStatus` (Scanning/Debrief, doing, Last).

### C2 · convention · `src/forcefield/classifiers/*.ts`
**What:** "Exported functions are `function` declarations". These are exported arrow consts:
- `classifyRm`, `classifyFind`, `classifyXargs` (`delete.ts:11,21,34`)
- `classifyGit` (`git.ts:29`)
- `classifyContainers`, `classifyKubectl`, `classifyHelm`, `classifyTerraform` (`infra.ts:15,28,38,41`)
- `classifyNodePackage`, `classifyRelease`, `classifyForge` (`publish.ts:16,21,27`)
- `classifyDatabaseWords` (`database.ts:47`)
- `isFlag` (`types.ts:8`)

**Fix:** `export function classifyRm({ args }: Segment, dir: Dir): Risk | null { … }`. The table still type-checks against `Classifier`.

### C3 · convention · multi-line file-private arrows
**What:** Arrows are for callbacks and one-liners. These multi-line ones break the rule:

| File | Lines | Arrow |
| --- | --- | --- |
| `src/core/config.ts` | 25 | `listSetting` |
| `src/domain/tasks.ts` | 5, 11, 17 | `stepText`, `fromList`, `fromPlanUpdate` |
| `src/domain/council.ts` | 70 | `firstRealLine` |
| `src/forcefield/shell.ts` | 27, 34, 83 | `runsCode`, `closingQuote`, `dropWhile` |
| `src/forcefield/classify.ts` | 14, 19, 30 | `programOf`, `folderStep`, `classifySegment` |
| `src/forcefield/classifiers/git.ts` | 9 | `subcommandOf` |
| `src/forcefield/classifiers/infra.ts` | 10 | `pruneSummary` |
| `src/forcefield/classifiers/database.ts` | 29 | `migration` |
| `src/forcefield/directives.ts` | 45 | `matchesCommand` |
| `src/forcefield/hold.ts` | 16, 27 | `partOf`, `secretVerb` |
| `src/forcefield/secrets.ts` | 9 | `isSecretFile` |
| `src/ui/viewscreen.tsx` | 22 | `lastJumpParts` |
| `src/ui/clients/loader.tsx` | 22, 33 | `litCells`, `runsOf` |

**Fix:** Make each a `function` declaration.

### C4 · convention · redundant aliases (finding 46, partial)
**What:** `const open = ui.view.deckOpen` is back in `src/ui/modules/shields.tsx:66` and `:94`, and finding 46 named exactly this alias. `writerName` (`src/domain/blackbox.ts:32`) is now a pure alias of `capitalize`.
**Fix:** Read `ui.view.deckOpen` directly. Either drop `writerName` and call `capitalize`, or keep it for the domain name but say why in a one-line doc.

### C5 · convention · glossary (finding 32, partial)
**What:** `src/events/jumps.ts:89-90` names the fleet `ships`, to avoid shadowing `fleet` from line 80. The comment at `src/events/command.ts:61` says "turn", where the glossary word is jump.
**Fix:** Destructure as `const [known, council]`, or test with `hasShuttle(await getShuttles($), id)`, and use `fleet =>` in the patch. Change "runs no turn" to "runs no jump".

### C6 · convention · boolean names
**What:** Several booleans do not start with `is`, `has`, `did`, `should` or `can`:
- `transmitting` (`src/ui/modules/council.tsx:23`)
- `showCouncil` (`src/ui/pane.tsx:12`)
- `active` in the loader's `Props` and `Ref` (`src/ui/clients/loader.tsx:4,14`)
- the `active` key built in `src/ui/widgets.tsx:95`

**Fix:** Use `isTransmitting`, `hasCouncil` and `isActive`; rename the client prop together with its sender.

### C7 · convention · comment length
**What:** Comments should be one line. These are longer:
- multi-line `/** */` blocks: `src/domain/tasks.ts:25-28`, `src/domain/blackbox.ts:18-21` and `:38-41`, `src/state/mission.ts:16-19`, `src/events/surface.ts:27-30`, `src/forcefield/shell.ts:43-46`, `types/index.d.ts:5-8`
- two-line `//` comments: `src/forcefield/folders.ts:14-15`, `src/forcefield/measure/git.ts:12-13`

**Fix:** Cut each to one line.

### C8 · convention · duplicated helpers and constants
**What:** "One implementation per job." Each of these is written two or three times:

| What | Where |
| --- | --- |
| `nonEmptyLines` | `src/forcefield/measure/paths.ts:34`, `measure/git.ts:20`, inline in `measure/refs.ts:58` |
| `ERROR_MAX` | `measure/index.ts:7`, `measure/git.ts:9` |
| `SCRIPT_NAME` | `folders.ts:8`, `measure/paths.ts:9` |
| `MIN_LOADER_ROOM` | `src/ui/frame.tsx:7`, `src/ui/modules/shuttle-card.tsx:14` |
| bridge `command: null` reducer | `src/events/session.ts:17`, `src/events/command.ts:51` |
| test `START` | `tests/support/pane.ts:3`, `tests/events/command.test.ts:4`, `tests/events/forcefield.test.ts:5` |
| pane request | `tests/events/forcefield.test.ts:6`, duplicating `paneRequest()` |
| hex `#3b82f6` | `src/ui/theme.ts:10` and `:34`; §9 says each hex is written once (finding 24) |

**Fix:**
- Put `nonEmptyLines`, `ERROR_MAX` and `SCRIPT_NAME` in `forcefield/risk.ts` or a small `forcefield/process.ts`.
- Put `MIN_LOADER_ROOM` in `ui/theme.ts`.
- Use `SVG_COLORS.running = SPACE.asteroids`.
- Import `START` and `paneRequest` in the tests.

### C9 · convention · hand-rolled plurals (finding 20, partial)
**What:** `src/core/format.ts:64` writes `days === 1 ? 'day' : 'days'`, and `src/forcefield/hold.ts:49` writes `risks.length === 2 ? 'part' : 'parts'`.
**Fix:** `` `${plural(days, 'day')} ago` `` and `` ` (+${plural(risks.length - 1, 'more risky part')})` ``.

### C10 · convention · magic numbers and hand-counted widths (finding 45, partial)
**What:** "Compute widths from the strings they measure; never hand-count." Hand-counted or unnamed values remain:
- `src/ui/modules/probes.tsx:10` `NOTE_RESERVE = 38` is the old hand count that finding 45 named (`w - 38`).
- `src/ui/modules/shuttle-card.tsx:12-13` `STATUS_ROOM = 12` and `LOADER_SLACK = 6` are hand counts; `:28` adds `name.length + 2`.
- `src/ui/modules/flight-paths.tsx:11` `WIDTH_PX - 160`, `:24` `Math.max(3, …)`, and the SVG literals `13`, `4`, `11`, `10`, `3` at `:27-28`.
- `src/core/format.ts:54-57` uses `1440` and `60` beside `MINUTE_MS`, `HOUR_MS` and `DAY_MS`.
- `src/ui/widgets.tsx:55` uses `props.width - 2`, the chevron's cells.
- `src/domain/council.ts:56` uses `width < 4`.
- `src/ui/hazard.ts:25` uses `4` and `25` (ring steps).

**Fix:**
- Probes: compute the reserve from the title, the note text and `FRAME_INSET`.
- Name the rest: `MINUTES_PER_DAY`, `CHEVRON_WIDTH`, `RING = '○◔◑◕●'` with `RING.length - 1`, `SVG_ROW_*`, `BAR_MIN_PX`, `LABEL_PX + AXIS_MARGIN_PX`.

### C11 · convention · unused exports
**What:** These are exported but used only in their own file. "No unused… exports."
- `TitleRow` (`src/ui/frame.tsx:13`)
- `normalizeEntry` (`src/domain/normalize.ts:88`)
- `addSpeed` and `limitOf` (`src/domain/usage.ts:59,14`)
- `HISTORY_MAX` (`src/domain/usage.ts:3`)
- `HAZARD_SCALE` (`src/ui/hazard.ts:8`)
- `PROBE_ACTIVE_MS` (`src/domain/fleet.ts:10`)
- `DEFAULT_ENTRY` (`src/domain/defaults.ts:101`, used only by a test)

**Fix:** Drop the `export`, or use the value where the plan intended (for example `addSpeed` from `bridge.ts`).

### C12 · convention · barrel bypass (finding 48, partial)
**What:** `src/forcefield/index.ts:7-8` imports `./measure/git` and `./measure/paths` deep, past `measure/index.ts`. `tests/ui/beacon.test.ts:4` imports `../../src/ui/hazard`.
**Fix:** Re-export `cleanArgs`, `diffRows`, `pushTarget` and `readRmOutput` from `measure/index.ts`, and `gaugeCells` from `ui/index.ts`. Import through the barrels.

### C13 · convention · closed sets and casts
**What:** Several closed sets are plain typed arrays:
- `ENTRY_KINDS` and `SHUTTLE_STATUSES` (`src/domain/normalize.ts:38-39`) repeat the contract's union literals as typed arrays.
- `MOMENTS` (`src/domain/council.ts:7`) is the same.
- `EFFORTS` (`src/domain/bridge.ts:5`) is `readonly string[]`, so effort is never a union.

§9 asks for `as const` arrays typed against the contract (`satisfies`). `match[1].toLowerCase() as DirectiveMode` (`src/forcefield/directives.ts:37`) casts where a guard would do.
**Fix:** `export const ENTRY_KINDS = ['info', …] as const satisfies readonly EntryKind[]`, and the same for the others. Narrow the mode with `isOneOf(DIRECTIVE_MODES, mode)`.

### C14 · convention · one concern per file
**What:**
- `tests/support/corpus/calls.ts` mixes configs, task calls, tool calls, prompts, hand-backs, reports, deck calls and the `STORED` state fixtures.
- `src/forcefield/risk.ts` mixes the `Risk` types, timeouts, `cd` path math (`joinDir`) and measure builders.

**Fix:** Move `STORED` to `tests/support/fixtures.ts` (also P10). Move `joinDir` to `classify.ts` or `shell.ts`, and the measure builders to `measure/index.ts`.

### C15 · convention · test functions over 50 lines
**What:** These `describe` callbacks pass 50 lines:
- `tests/ui/pane.test.tsx:7-67` (61)
- `tests/domain/mission.test.ts:23-81` (59)
- `tests/domain/fleet.test.ts:21-76` (56)
- `tests/events/forcefield.test.ts:33-87` (55)

`tests/domain/fleet.test.ts:78` names a helper `never`.
**Fix:** Split the `describe` blocks by topic. Rename the helper `missing()`.

### C16 · convention · `scripts/validate-snapshot.sh:9-26`
**What:**
- The awk uses single-letter names (`n`, `c`, `k`, `v`, `j`).
- `-F': '` keeps only `$2`, so any note with a second `: ` loses its tail without a sign.
- The script needs `jq`, which `AGENTS.md` does not mention.

**Fix:**
- Rename to `count`, `char`, `pos`, `item`, `prev`.
- Take the text after the first `: ` with `sub(/^[^:]*: /, "")`.
- Add `jq` to the Commands section.

### C17 · convention · `docs/conventions.md:8,9,38`
**What:** The conventions contradict the architecture:
- Line 38 says shared constants go in `core/limits.ts`, but §9 says "There is no `limits.ts`".
- Line 9 gives `shields/` as an example folder; there is none.
- Line 8 allows 400 lines as a hard cap, but §3 says none may pass 300.

**Fix:** Align `conventions.md` with the architecture.

---

## Nits, including small behaviour changes

| Id | Where | What | Fix |
| --- | --- | --- | --- |
| N1 | `src/state/council.ts:29` | **Behaviour.** A report whose first real line strips to empty (`---`, `#`) used to clear `lastAdvice` to `''`. Now `adviceLine(...) \|\| null` keeps the earlier transmission's advice, so stale advice can show under a new transmission. Not covered by the declared finding-16 change. | Either pass `''` through for a present-but-empty report, or record the change in the fix commit. |
| N2 | `src/domain/normalize.ts:74` | **Behaviour.** An unknown stored shuttle status now reads `running`, so the card shows in flight forever with a live clock and loader. The old code showed the raw word and treated it as landed. | Map unknown statuses to `stopped`. |
| N3 | `src/ui/modules/bridge.tsx:20`, `src/ui/modules/shuttle-card.tsx:74` | **Behaviour.** The old `prettyModel(x) \|\| '—'` fallback is gone, so a whitespace-only model id prints nothing. | Restore `\|\| '—'`, or have `prettyModel` return `—` for an empty result. |
| N4 | `src/domain/calls.ts:28` | **Behaviour.** An empty-string `pattern` now falls through to `url` or `description`. The old code stopped at the empty pattern. | Use `typeof call.pattern === 'string' ? call.pattern : …` to keep it identical. |
| N5 | `src/events/agents.ts:30` | **Behaviour.** The write order changed: the probe is dropped before the council id or shuttle is written (old order: council or shuttle first, then the probe). Only visible between writes. | Move `patchProbes` after the council or shuttle write. |
| N6 | `src/domain/blackbox.ts:42-50` | **Behaviour.** Duplicate fold keys (`-1`, `-2`) are counted from the oldest entry kept. When the 200 cap trims the oldest duplicate, the later one's key shifts, so a rare unfolded line folds again. | Use the entry's position in the full stream (for example `at`, `who` and a per-`at` sequence written at log time), or accept it and note it. |
| N7 | `src/domain/normalize.ts:116-118` | **Behaviour (benign).** A stored `hazards` or `deckOpen` outside the union now reads as null; the old code used the raw value. | None. Mention it in the fix commit. |
| N8 | `src/ui/widgets.tsx:79,94` | `LiveClock` and `Connector` test `'Client' in els` while `UiContext.hasClient` exists. `TitleRow` and `ShuttleTitle` use `hasClient`. | Use `ui.hasClient` (give `Viewscreen` a `hasClient` too). |
| N9 | `src/ui/clients/loader.tsx:8-11`, `src/ui/widgets.tsx:95` | `marks` and `isMerge` are always `[]` and `false`; the branch-mark feature is dead. | Drop both props from the client, or record why they stay. |
| N10 | `src/events/surface.ts:14`, `src/events/tools.ts:30`, `src/domain/fleet.ts:77` | No explicit return type, unlike the rest of the code base. | Add `Promise<UiOpenResult>`, `Promise<void>` and a `FlightPath[]` type. |
| N11 | `src/forcefield/measure/git.ts:14`, `src/domain/defaults.ts` | `GIT` is an exported mutable `string[]`. `DEFAULT_*` objects are exported mutable and share nested references (`DEFAULT_SHIELDS.totals.*` all point to `ZERO_TALLY`). | Type them `readonly` (`as const`, `Readonly<…>`). |
| N12 | `src/events/runtime.ts:9`, `src/events/render.tsx:23` | `surface` is `string \| null` rather than `RenderSurface \| null`. `PaneView` reuses "view", which is the `View` state's word. | Type it, and rename to `PaneRequest`. |
| N13 | `src/forcefield/measure/git.ts:64` | `measureDiscard(… risk: Risk …)` takes any risk, though it handles only reset and checkout. | `Extract<Risk, { kind: 'git-reset' \| 'git-checkout' }>`. |
| N14 | `tests/**` (73 uses) | `as never` stands in where the kit's types would do, an escape hatch close to the banned `as unknown as`. | Type requests with the kit's `Args<…>` and result types, or a typed helper in `tests/support/`. |

---

## The 50 review findings

| # | Status | Note |
| --- | --- | --- |
| 1 | resolved | `tallyTotal` in the deck buttons; tested (`shell 1`) |
| 2 | resolved | `DEFAULT_HELD`, `held` required, no `?? 0` readers |
| 3 | resolved | `keyedEntries` keys `log-<at>-<who>[-n]`; tested; trim edge in N6 |
| 4 | resolved | `Runtime` created in `registerHooks` |
| 5 | resolved | split into `state/`, `events/`, `ui/` |
| 6 | resolved | `core/` and `domain/` |
| 7 | resolved | `hooks/` holds `hooks.json` and `skywatch.ts`; clients in `src/ui/clients/` |
| 8 | resolved | `classify.ts` and `classifiers/` vs `measure/` |
| 9 | partial | table and `commandWords` in, but the table matches prototype names (B2) |
| 10 | resolved | |
| 11 | resolved | 201 tests; gaps in P5, P10, P11 |
| 12 | partial | `get`/`patch` normalize once; ad-hoc spreads remain at call sites (P15) |
| 13 | resolved | `withShuttle` with `patchShuttles` |
| 14 | resolved | one `capitalize` (`writerName` is now an alias, C4) |
| 15 | resolved | clock imports `fmtTimer` |
| 16 | resolved | `endTransmission` uses `adviceLine`; tested; side effect in N1 |
| 17 | resolved | `usageFrom` used at session start and in `recordUsage` |
| 18 | resolved | `ModuleFrame` in all six modules; cards use `Frame` |
| 19 | resolved | `Bar` in the viewscreen and pane |
| 20 | partial | measures use `plural`; `fmtAgo` and `hold.ts` hand-roll it (C9) |
| 21 | resolved | shared `SEPARATORS`; `segmentsOf` and `rawSegmentsOf` |
| 22 | resolved | `currentBranch` read once |
| 23 | resolved | `applyStep` calls `stepTokens` |
| 24 | partial | `HAZARD_SCALE` built from `SPACE`, but `#3b82f6` is written twice (C8) |
| 25 | resolved | `VERDICT_STYLE`; crash on unknown verdict in B3 |
| 26 | resolved | `SHUTTLE_STATUS` |
| 27 | resolved | `MODULE_VIEWS` |
| 28 | resolved | classifies once |
| 29 | resolved | describes once |
| 30 | resolved | `FlightPaths` uses the resolved `Svg` and checks for it |
| 31 | resolved | no single-letter domain names; no shadowing found |
| 32 | partial | `ships` and "turn" (C5) |
| 33 | resolved | loop variable `segment` |
| 34 | resolved | `fmtBytes` |
| 35 | resolved | |
| 36 | resolved | `Deck`; `DeckName` gone |
| 37 | resolved | `HazardMode` in the contract |
| 38 | resolved | |
| 39 | resolved | `handbackMessage` guard |
| 40 | resolved | one doc block per declaration |
| 41 | partial | extra and multi-line comments (P13, C7) |
| 42 | resolved | no banners |
| 43 | resolved | `Stack` maps with an expression body |
| 44 | resolved | |
| 45 | partial | most named; hand counts and literals remain (C10) |
| 46 | partial | `open` is back (C4) |
| 47 | resolved | |
| 48 | partial | barrels, but two deep imports (C12) |
| 49 | resolved | `fmtAgo`, `fmtSpeed`, `EFFORTS`, `effortPct`, `GAUGE_WIDTH` |
| 50 | resolved | moments `Box` without braces |

## Declared deviations: judgement

| Deviation | Sound? | Note |
| --- | --- | --- |
| `docs/architecture-draft.md` kept | yes, with a condition | needs a "superseded" marker (P3) |
| `TitleRow`/`ModuleFrame` in `src/ui/frame.tsx` | yes | `widgets.tsx` (`Effort`) needs `Sep` from `layout.tsx`, and `TitleRow` needs `Connector` from `widgets.tsx`, so a third file avoids the cycle. `TitleRow` need not be exported (C11). Record it in §3 (P2). |
| `Stack` takes `items` | yes | |
| `keyedEntries` instead of `foldKey` | yes | handles same-time, same-writer entries; trim edge in N6 |
| `tests/support/corpus/` + generated `golden.ts` | yes, with a condition | a strong characterization net, but the generator must be committed (P12). `STORED` belongs in its own fixtures file (P10, C14). |
| `tests/support/pane.ts` | yes | two tests still define their own copies (C8) |
| `holdFor` tested through `$.tool.call` | yes, forced by the kit | the secret plus measure summary, a command directive overriding the temp-folder pass, a block on `@secrets`, and git outside the session folder are untested |

## Behaviour fixes: verified

| Fix | Code | Test |
| --- | --- | --- |
| Deck counts include `blocked` | `src/ui/modules/shields.tsx:68` | `tests/ui/pane.test.tsx:28` |
| Fold keys stable | `src/domain/blackbox.ts:42` | `tests/domain/blackbox.test.ts:36`, `tests/ui/pane.test.tsx:52` |
| `endTransmission` uses `adviceLine` | `src/state/council.ts:29` | `tests/events/agents.test.ts:37` (side effect in N1) |
| Bare `/skywatch` launches | `src/events/command.ts:29` | `tests/events/command.test.ts:7`; the README already documented it |
| A `cd` folder carries past an earlier risk | `src/forcefield/classify.ts:61` | `tests/forcefield/classify.test.ts:16`. This also changes which later `rm`s count as temp-only and where they are measured, which is intended. |

## Behaviour compared with the old code: checked and unchanged

These were compared line by line with `starbase.tsx`, `core.ts` and `forcefield.mjs`, and match apart from the items above:
- every user-visible string;
- every colour, by module, verdict, status, writer and hazard;
- every element key (`turn-clock` became `jump-clock`, as planned);
- the order of state writes in every hook, except N5;
- `$.ui.invalidate` and `refreshStatus` calls;
- the slash command texts and the command registration;
- force-field verdict reasons and black box lines;
- every measure summary and note;
- `isTempOnly`, `resolveDir`, `RM_SCRIPT`, `TEMP_SCRIPT`, `CD_SCRIPT` and the `GIT` argv;
- classifier order, labels and groups;
- the shell parsing (heredocs, quotes, segments, scopes, prefixes);
- deck matching, task-list reading, the redaction patterns and every formatter;
- the pane layout widths and the viewscreen and beacon text.

---

## Resolution

Applied after this review; checked with `npm run check` (clean), `npm test` (217 pass) and `npm run validate` (no diff).

| Id | Outcome |
| --- | --- |
| B1 | Reopened in review 02 (R1-1): fixed by the license step, after the refactor's commits. |
| B2 | `CLASSIFIERS` is a `Map`; `__proto__`, `toString`, `constructor x`, `valueOf` are tested to classify as nothing. |
| B3 | `normalizeShields` narrows each stored check: an unknown verdict reads as `deny` (stopped), an unknown deck as `other`; tested. |
| B4 | `WRITER_COLOR` is a `Map`. |
| P1 | Committed as a short series at the end, after the review rounds. |
| P2 | `architecture.md` §3 is the tree as built; §15 lists what changed from the plan. |
| P3 | The draft opens with a "superseded" banner. |
| P4 | `plugin.json` restored and kept out of Biome. |
| P5 | README row reworded; `tests/events/jumps.test.ts` added. |
| P6 | `BLACKBOX_PAGE` and `newEntry` in `domain/blackbox.ts`. |
| P7 | `completeAgent` delegates to `completeShuttle`; recorded in §15. |
| P8 | `PANE_MIN_WIDTH` in `ui/theme.ts`, through the barrel. |
| P9 | `DEFAULT_PROBE`, `DEFAULT_LAST_JUMP`, `DEFAULT_COST` merged per item. |
| P10 | `tests/support/fixtures.ts` types `STORED` for all 13 keys; every key and fixture is checked for the full shape. |
| P11 | Block test counts one blocked; viewscreen test checks the gauge cells and `Last jump`; the directives report is compared whole. |
| P12 | `scripts/golden.sh` regenerates `golden.ts` byte for byte from `39dcedb`. |
| P13 | Extra comments cut or made one line; two why-comments in `hold.ts` (git config outside the folder, the temp-folder pass) stay, as rules the code cannot say. |
| P14 | `joinDir` moved to `shell.ts`, which carries the header. |
| P15 | Named reducers replace the call-site spreads. |
| C1 | `Readings` split into `CardGauges`, `CardReading`, `CardCalls`. |
| C2, C3 | Classifiers and multi-line helpers are `function` declarations. |
| C4 | `open` alias gone; `writerName` removed for `capitalize`. |
| C5 | `ships` and "turn" gone. |
| C6 | `isLive`, `hasSat`, `isActive` (client prop too). |
| C7 | Multi-line comments cut to one line. |
| C8 | `nonEmptyLines`, `ERROR_MAX`, `SCRIPT_NAME` in `forcefield/process.ts`; `MIN_LOADER_ROOM` in the theme; `SVG_COLORS.running` is `SPACE.asteroids`; tests share `START` and `paneRequest` from `drive.ts`. |
| C9 | `plural` in `fmtAgo` and `hold.ts`. |
| C10 | Partly; reopened in review 02 (R1-19). Named: time units, SVG geometry, `CHEVRON_WIDTH`, `RING`, `MIN_TIMELINE_WIDTH`, card widths (`NAME_PREFIX` measured). The probes' dot margin keeps its old value under a name, since it was never derived from a string. |
| C11 | Unused exports dropped. |
| C12 | Reopened in review 02 (R1-17), then fixed: measure readers through `measure/index.ts`; `gaugeCells` through the UI barrel. |
| C13 | `as const satisfies` for entry kinds, statuses, verdicts, moments, efforts; directive modes narrowed with `isOneOf`. |
| C14 | `STORED` in `fixtures.ts`; `joinDir` in `shell.ts`; measure builders in `measure/result.ts`. |
| C15 | Long `describe` blocks split by topic; the `never` helper is gone. |
| C16 | Awk names spelled out, the list taken after the first `: `, `jq` noted. |
| C17 | `conventions.md` aligned with the architecture. |
| N1 | A present report that strips to nothing clears the advice, as before. |
| N2 | Unknown stored shuttle status reads as stopped. |
| N3 | `prettyModel` falls back to `—`. |
| N4 | `describeInput` stops at the first string field, empty or not, as before. |
| N5 | Probe drop after the council or shuttle write, as before. |
| N6 | Accepted and recorded in §15. |
| N7 | No change needed. |
| N8 | No change: `'Client' in els` is what narrows the element table for TypeScript. |
| N9 | `marks` and `isMerge` dropped from the loader. |
| N10 | Return types added. |
| N11 | `GIT` is `readonly string[]`. `DEFAULT_*` stay typed by the contract: no code mutates them, and deep `Readonly` would not assign to the stored types. |
| N12 | `surface` typed `RenderSurface`; `PaneView` renamed `PaneRequest`. |
| N13 | `measureDiscard` takes `RiskOf<'git-reset' \| 'git-checkout'>`. |
| N14 | All `as never` casts gone; two builders in `drive.ts` (`skywatch`, `spawn`) hold the only partial kit inputs; `scripts/golden/print-golden.test.ts` keeps two casts, as it runs against the untyped pre-refactor modules. |

