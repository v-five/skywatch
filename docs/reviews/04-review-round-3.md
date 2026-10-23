# Review 04, round 3: the whole SkyWatch refactor, reviewed and fixed

Scope: the uncommitted working tree against `HEAD` (`39dcedb`), after rounds 1 and 2. Every file under `claude-code/src`, `claude-code/hooks`, `claude-code/types`, `claude-code/tests`, `scripts/`, the root config and `docs/` was read. The pre-refactor `starbase.tsx`, `core.ts`, `forcefield.mjs`, `clock.tsx` and `loader.tsx` were read in full again and compared hook by hook, measure by measure and module by module. Decisions recorded in reviews 01 to 03 were not reopened. This round looked for what they missed: values from outside the mod (engine unions, stored state), names written in two places, and test helpers written twice. Each finding was fixed in place where that was safe. Line numbers are those before the fix. Paths starting with `src/`, `tests/`, `types/` or `hooks/` are under `claude-code/`.

## Summary

| Severity | Count | Fixed | Kept, with a reason | Open |
| --- | --- | --- | --- | --- |
| bug | 1 | 1 | 0 | 0 |
| regression | 1 | 1 | 0 | 0 |
| design | 3 | 2 | 0 | 1 |
| convention | 7 | 5 | 2 | 0 |
| test | 5 | 4 | 0 | 1 |
| docs | 4 | 4 | 0 | 0 |
| nit | 6 | 2 | 4 | 0 |
| **total** | **27** | **19** | **6** | **2** |

Behaviour changes made by this round:

- **R3-1** (declared): a shuttle's spawn entry is written under the same name as its later entries, cut at 14 characters. It was cut at 12, so a shuttle whose label is longer than 12 characters showed under two names.
- **R3-2**: a completion reason or check decision that a newer engine adds now reads as `failed` or stopped. Today's engine sends neither, so nothing changes for it.
- **R3-3**: only stored values that are already corrupt change. A null-default field of the wrong type now reads as null.

No hook, matcher, `$` call, state key, element key or colour changed. `validate` and `golden.ts` are unchanged.

## Bugs

### R3-1 · bug (pre-existing) · `src/events/agents.ts:20,46`, `src/state/log.ts:7,27`

The spawn entry wrote the shuttle as `shorten(shuttleLabel(shuttle), 12)`. Every later entry (`whoIs`: tools, `max_tokens`, landing, a held call's "from") used 14. A shuttle labelled `scan the repository` therefore wrote "Scan the re…" at its spawn and "Scan the repo…" after it. The old code had the same two widths.

**Fixed:** `shuttleWriter(shuttle)` in `domain/fleet.ts` (`WRITER_MAX = 14`) is used by `whoIs` and the spawn entry. Tested in `tests/events/agents.test.ts` ("a shuttle writes under one name"). Declared in `docs/architecture.md` §15.

## Regressions

### R3-2 · regression (forward compatibility) · `src/domain/fleet.ts:62-64`, `src/domain/shields.ts:29-31`

R1-15 turned `statusOf` and `checkVerdict` into `Record` lookups typed by the engine's unions. Type-checking covers the engine this mod was built against. An installed mod, though, keeps running when Claude Code updates. A `TurnCompleteReason` that a newer engine adds would then give `undefined`. That status is stored, and `normalizeShuttle` reads a missing status as its default `running`, so the shuttle would show in flight forever. The old code read any other reason as `failed`. An unknown decision likewise gave an `undefined` verdict and a `NaN` tally.

**Fixed:** `STATUS_OF[reason] ?? 'failed'`, as before the refactor, and `VERDICT_OF[decision] ?? 'deny'`, which matches how a stored unknown verdict already reads. Each has a one-line why-comment. Tested in `tests/domain/fleet.test.ts` and `tests/domain/shields.test.ts`.

## Design

### R3-3 · design (type safety; render crash on corrupt state) · `src/core/guards.ts:5-11`, `src/domain/normalize.ts`

`mergeDefaults` kept "anything set for a null default", so these fields passed under their declared types with any value:

- `Usage.pct`, `tokens`, `costUsd`, `lastCompactAt`
- `Jump.costAtStart`, `promptAt`
- `LastJump.costDelta`
- `LineCost.usd`
- `Bridge.speed`, `doing`, `doingTitle`, `command`, `task`
- `Shuttle.endedAt`, `lastStop`, `doing`, `doingTitle`, `task`, `speed`
- `Transmission.endAt`
- `View.expanded`

A string in any of the three money fields made `fmtUsd` call `toFixed` on a string, which throws while the Mission module or the black box draws. R2-2 closed the same hole for list items.

**Fixed:** `mergeDefaults(defaults, stored, nullable)` takes a guard per null-default field (`NullableFields<T>`). A stored value is kept only when it is null or passes its guard (`isNumber`, `isString`, or a private `isSpeed`). `normalizeView` now narrows `deckOpen` and `hazards` through the same parameter. Tested in `tests/domain/normalize.test.ts` ("a field whose default is null keeps only null or a value of its type").

### R3-4 · design (fail-open consistency) · `src/events/tools.ts:146-149`

`tool.check` computes its verdict first and records it through `bestEffort` (R1-2). Stamping the held call's `since`, however, ran outside it: `await $.clock.now()` and `$.ui.invalidate`. If either throws, the whole hook throws, and the engine's own verdict stands, so a hold fails open. A scratch test confirmed that a throwing `tool.check` hook lets a held `rm` run.

**Fixed:** `markAsked($, runtime, id, held)` runs through `bestEffort`. If it fails, the call is still asked; the pane just shows no wait clock.

### R3-5 · design (pre-existing; open) · `src/events/agents.ts:74`, `src/state/council.ts:43-45`, `src/domain/council.ts:5`

`agent.offer` adds a type to `councilRoster` only when `COUNCIL_TYPES` (`/advisor|architect/i`) matches it. `isCouncilType` then checks `COUNCIL_TYPES.test(type) || roster.includes(type)`, and every type in the roster already passes the regex. So the roster, its state key, its reducer and the `agent.offer` hook can never change a result. The old code is identical. The roster only makes sense if the offer matched something other than the type name, such as `e.description`: an agent whose listing calls it an architect, under a name that does not.

**Open, needs your decision:** either match `COUNCIL_TYPES` against the offered agent's description as well (a behaviour change), or drop the roster. Dropping it changes the 13-key state contract, `scripts/validate-baseline.txt` and the `agent.offer` hook.

## Convention

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R3-6 | `src/forcefield/secrets.ts:10,16-18`, `src/domain/calls.ts:25` | A path's base name was split in two places, and `secretFileOf` re-read `input.command` itself instead of using `commandOf`. | Fixed: `baseName` in `core/text.ts`, used by both; `secretFileOf` uses `commandOf`. |
| R3-7 | `src/domain/council.ts:62` | Loop variable `t` in a three-line loop. | Fixed: `transmission`. |
| R3-8 | `src/ui/modules/shields.tsx:14`, `src/forcefield/directives.ts:24` | `VERDICT_WORD_WIDTH = 8` and `MODE_WIDTH = 5` were hand-counted from the words they pad. | Fixed: measured from `VERDICT_STYLE` (longest word plus a space) and `DIRECTIVE_MODES`. Same values. `TARGET_WIDTH = 28` stays: it is a column choice, not a measured text. |
| R3-9 | `src/forcefield/hold.ts:80`, `src/forcefield/directives.ts:27` | `holdFor` re-implemented `isGroupTarget` with `startsWith('@')`. | Fixed: `isGroupTarget` exported from `directives.ts` (not from the barrel) and used by `hold.ts`. |
| R3-10 | `tests/support/world.ts:5-6` | `NOW` and `SESSION_ID` exported, and used nowhere else. | Fixed: module constants. |
| R3-11 | `src/core/config.ts:15` | `Config.autoLaunch` is a boolean without an `is`/`has` prefix. | Kept: it mirrors the `autoLaunch` setting in `plugin.json`, as R2-39 kept `inSubagent`. |
| R3-12 | `forcefield/directives.ts` `DirectiveMode`, `domain/fleet.ts` `FlightPath`, `ui/hazard.ts` `Hazard`, `ui/frame.tsx` `NotePart`, `domain/calls.ts` `ServerBlock`, `domain/mission.ts` `StepTokens`, `domain/tasks.ts` `TaskStep` | Types exported but imported nowhere. | Kept: each names the result, props or a field of an exported function or type, so a caller can spell it. |

## Tests

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R3-13 | `tests/events/forcefield.test.ts:6-8,47-52,65-70`, `holds.test.ts:7-19,48-63`, `tools.test.ts:7-9`, `ui/pane.test.tsx:32,43` | The `tool.call` answer was written in seven places (two private `runTools`). `forcefield.test.ts` read the held pane by hand twice, while `holds.test.ts` had `heldTexts`. "Blocks and passes" tests lived in both files. | Fixed: `runTools(on, fails?)` in `world.ts` and `heldTexts()` in `drive.ts`. Blocks and passes now live in `forcefield.test.ts`, holds and measures in `holds.test.ts`. |
| R3-14 | `tests/events/jumps.test.ts` | A shuttle's step through the kit was untested: Fuel (`applyStep`), the effort taken from the step, and `max_tokens` (R1-28's remaining gap). | Fixed: "a shuttle's step fills its Fuel and effort; max_tokens marks its card and the black box". |
| R3-15 | `tests/events/forcefield.test.ts` | A refusal by Claude Code's own rules was untested: the "stopped by rule" entry, the Protocols count and the beacon's "stopped 1". | Fixed: the test answers `tool.check` with a `deny`. |
| R3-16 | `tests/events/session.test.ts` | `world`'s `usage: null` (a host without usage) was never used. | Fixed: the session starts at clear space, and a jump's cost line has no dollars. |
| R3-17 | `src/events/tools.ts` (R3-4) | No kit test pins R3-4. A throwing `ui.invalidate` answer does not reach the hook (checked in a scratch test), and `world`'s mock clock cannot reject. | Open: it needs a kit way to fail `$.clock.now`. |

## Docs

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R3-18 | `docs/architecture.md` §5 | The shared state actions left out `readUsage`, `contextNow` and `followSession`. | Fixed. |
| R3-19 | `docs/architecture.md` §13 | Rows 18, 30, 32, 33 and 49 named the plan's locations, not the final ones: `ModuleFrame` in `layout.tsx`, `modules/flight-paths.tsx`, `callerOf`, loop variable `segment`, `EffortBar`. | Fixed. |
| R3-20 | `docs/architecture.md` §3, §5, §11, §15; `claude-code/AGENTS.md` | The new `NullableFields`, `baseName`, `runTools` and `heldTexts` were not listed. | Fixed, with a §15 entry for this round. |
| R3-21 | `docs/architecture.md` §12 step 10 | The step plans to delete `docs/architecture-draft.md`, but the file stays, marked superseded, as §3 and `AGENTS.md` say. | Fixed: §15 records that it stays. |

## Nits

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R3-22 | `src/forcefield/shell.ts:68-78` | `segmentsOf` repeated `rawSegmentsOf`'s split. | Fixed: `segmentsOf` trims `rawSegmentsOf`. |
| R3-23 | `src/events/commands.ts:13` | `setHazards` also shows the mode when given none. | Fixed: `runHazards`, beside `runSkywatch`, with a one-line doc comment. |
| R3-24 | `src/forcefield/classifiers/types.ts` | A file named `types.ts` holds the `isFlag` helper too. | Kept: it is the classifiers' shared contract, and a rename is churn. |
| R3-25 | `src/events/*`, `tests/ui/pane.test.tsx:75`, `tests/events/session.test.ts:48`, `tests/ui/viewscreen.test.tsx:7` | Hook callbacks use `e`, and test hooks shadow the test's `$`. | Kept: `($, e, next)` is the engine's idiom, and a hook's `$` must be spelled literally. |
| R3-26 | `src/ui/widgets.tsx:88,103` | `LiveClock` and `Connector` test `'Client' in els` although the context carries `hasClient`. | Kept: the `in` test is what narrows the element table so `els.Client` can be drawn. |
| R3-27 | `src/ui/theme.ts:60-64` | `entryColor` maps two of the closed `EntryKind` values with `if`s, not a table. | Kept: two kinds have their own colour and the rest fall through to the writer's, so a partial table would read no clearer. |

## Still open from earlier rounds

Unchanged by this round, each with its reason in its own review:

- R1-1: `claude-code/LICENSE` and `NOTICE`; the license step.
- R1-30 / R2-27: a refused prompt's settle needs a check in a real session.
- R2-5: the `jump-clock` key; your decision.
- R2-28: `migrateState` and `followSession` have no kit test.
- R2-34: failing closed when SkyWatch itself errs; a product decision.
- R2-35: `attachCost` by `at`.
- R2-36: PowerShell is not classified.
- R2-37: hand-rolled label columns.

## Checked and unchanged

- The force field against `forcefield.mjs` and the old `riskOf`/`measureRisk`:
  - group mapping, prefixes, `cd`/`pushd`/`popd` and subshell scopes
  - every measure's argv, timeouts, summaries and notes
  - the temp-folder rule, the outside-the-session-folder rule and the measure fallbacks
- Every hook against `starbase.tsx`:
  - write order, refresh and invalidate points
  - the hand-back and `Agent` exits
  - probe, council and shuttle routing in `turn.step` and `turn.complete`
  - `session.append` transmissions, `agent.spawn`, both `command.run` hooks and their texts
- The pane, module by module:
  - rows, labels, colours, widths (`nameWidth`, loader room, note lengths, dot strip, sensors strip, black box columns), glyphs, fold keys and element keys
  - the viewscreen, the beacon, and both client modules (the loader's dropped `marks`/`isMerge` props were always empty)
- Layers import downward only, through barrels. No `$` in objects, tables or arrow constants. No dynamic import. Every file is under 300 lines, and no function is over 50.

## Gate results (last run)

| Gate | Result |
| --- | --- |
| `npm run check` | exit 0: Biome checked 128 files, no diagnostics; tsc no errors |
| `npm test` | 250 pass, 0 fail, 29 files (was 244) |
| `npm run validate` | exit 0, no diff against `scripts/validate-baseline.txt` |
| `sh scripts/golden.sh` | exit 0; `tests/support/golden.ts` byte-identical to the copy taken before this round |
