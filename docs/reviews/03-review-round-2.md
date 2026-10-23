# Review 03, round 2: the whole SkyWatch refactor, reviewed and fixed

Scope: the uncommitted working tree against `HEAD` (`39dcedb`), after round 1's fixes. Every file under `claude-code/src`, `claude-code/hooks`, `claude-code/types`, `claude-code/tests`, `scripts/`, the root config and `docs/` was read, and the pre-refactor `starbase.tsx`, `core.ts`, `forcefield.mjs`, `clock.tsx` and `loader.tsx` were compared hook by hook where behaviour could drift. Round 1's conclusions were re-checked rather than assumed. In this round each finding was fixed in place where that was safe. Line numbers are those before the fix. Paths starting with `src/`, `tests/`, `types/` or `hooks/` are under `claude-code/`.

## Summary

| Severity | Count | Fixed | Kept and declared | Not fixed |
| --- | --- | --- | --- | --- |
| bug | 1 | 1 | 0 | 0 |
| regression | 2 | 0 | 2 | 0 |
| design | 7 | 3 | 0 | 4 |
| convention | 10 | 9 | 0 | 1 |
| test | 7 | 5 | 0 | 2 |
| docs | 6 | 6 (one in part) | 0 | 0 |
| nit | 7 | 5 | 0 | 2 |
| **total** | **40** | **29** | **2** | **9** |

Behaviour changes made by this round: only R2-2 and R2-3, and only for stored values that are already corrupt, where a bad list item is now dropped or filled instead of passed on. No user-visible text, colour, element key, stored shape, hook, `$` call or state key changed. `validate` and `golden.ts` are unchanged.

## Bugs

### R2-1 · bug (latent; fail-open) · `src/events/tools.ts:66-67,154`, `src/state/log.ts:23-27`

`tool.call` runs `holdCall` through `bestEffort`. `holdCall` stores the measured hold only after `whoIs`, which reads the fleet from state. If that read rejected, the draft was lost and the call went to `tool.check` with no hold, so a `hold` or `block` directive failed open. The old code let the rejection propagate. `holdFor` itself has no path that rejects: its measures sit in `try` blocks.

**Fixed:** `whoIs` never rejects (a failed fleet read gives the `shuttle` writer), so a held call always keeps its hold. Its doc comment says why.

## Regressions

### R2-4 · regression (undeclared text change) · `src/forcefield/hold.ts:28-31`

The secret line's verb for a `PowerShell` call is now "touch" (`SHELL_TOOLS`). The old code said "change", because it checked only `Bash`. "touch" is the more accurate word for a shell command, and the engine's own tool list has no `PowerShell`, so the kit cannot test it.

**Kept and declared** in `docs/architecture.md` §15. Revert the verb to `tool === 'Bash'` if the old text must stay.

### R2-5 · regression (undeclared element key) · `src/ui/modules/mission.tsx:71`

The running jump's clock key is `jump-clock`. Before the refactor it was `turn-clock`. Round 1 noticed the change but no doc declared it. The only effect is that a clock open during the reload that loads this version restarts once.

**Kept and declared** in §15, since `turn-clock` breaks the glossary's jump/turn rule. **Needs your decision** if element keys must stay byte-identical.

## Design

### R2-2 · design (type safety; render crash on bad state) · `src/core/guards.ts:21-23`, `src/domain/normalize.ts:51,56,61,91,133,139`

`listOf<T>` cast `unknown[]` to `T[]` unchecked, and the normalizers never read list items. A stored `usage.limits` item that is `null` crashed the Mission module (`limitLabel(limit.kind)`). A non-string `plan` step flowed into `bridge.task`. `transmissions`, `tools`, `ids`, `seen`, `unfolded`, `councilTypes` and `history` were trusted the same way. On lists that were already arrays, `listOf` after `mergeDefaults` was also a no-op.

**Fixed:** `listOf` returns `unknown[]`, and new `isString` and `isNumber` guards narrow it. Each list is read item by item: plan, ids, seen, unfolded and councilTypes keep strings, history keeps finite numbers, and limits, transmissions and tool notes are records merged over a per-item default (an unknown `moment` reads as `before a plan`). Tested in `tests/domain/normalize.test.ts` ("reading stored lists").

### R2-3 · design · `src/domain/normalize.ts:80`

`normalizeShields` kept `totals` entries under any key, although they are typed `Partial<Record<Deck, Tally>>` and §3 says unknown decks are narrowed. Such keys were summed into the Shields header.

**Fixed:** only known decks are kept. This changes nothing for state this mod wrote.

### R2-10 · design (duplication) · `src/domain/mission.ts:43,51`

`jumpCost` and `lastJumpOf` each computed the cost delta.

**Fixed:** a private `costSince(jump, costNow)`.

### R2-34 · design (not fixed) · `src/events/tools.ts:154`

`holdFor` as a whole runs under `bestEffort`. A future rejection inside it would let a risky call through unheld. Today nothing in it rejects (see R2-1).

**Not fixed:** failing closed, which would refuse the call when SkyWatch itself errs, is a product decision.

### R2-35 · design (pre-existing; not fixed) · `src/domain/blackbox.ts:22`

`attachCost` finds the prompt entry by its `at` alone. A bridge entry written in the same millisecond, such as the compaction notice, would get the cost too.

**Not fixed:** an entry id would change the stored `BlackboxEntry` shape.

### R2-36 · design (pre-existing; not fixed) · `src/forcefield/hold.ts:63`

Only `Bash` commands are classified, while decks and secrets treat `PowerShell` as a shell.

**Not fixed:** the classifier reads bash syntax, and the engine has no `PowerShell` tool.

### R2-37 · design (not fixed) · `src/ui/modules/shields.tsx:81-95`, `parts/held.tsx:18-29`, `mission.tsx:64-78`

`Decks`, `HeldCall` and `Jumps` hand-roll the label column that `Row` and `RowBlock` draw.

**Not fixed:** folding them in changes the element tree that surfaces lay out.

## Convention

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R2-6 | `src/state/log.ts:24,26`, `state/mission.ts:22`, `state/council.ts:26,34,39`, `events/tools.ts:55,59,79`, `domain/blackbox.ts:29-33`, `ui/theme.ts:53-57` | Writer names (`bridge`, `shields`, `council`, `captain`, `comms`, `shuttle`) were magic strings shared by state, events and the UI's colour map. | Fixed: `WRITERS` in `domain/blackbox.ts`, used everywhere. |
| R2-7 | `src/core/format.ts:17-66`, `ui/modules/parts/flight-paths.tsx:32` | Single-letter names (`n`, `s`, `m`, `d`, `h`, `x`). | Fixed: `count`, `seconds`, `minutes`, `days`, `hours`, `usd`, `size`, `barX`. |
| R2-8 | `src/core/format.ts:7-10,45,56`, `domain/usage.ts:56` | Hand-computed `1440`, `60_000`, `3_600_000`, `86_400_000`; bare `100`, `10`, `1000`. | Fixed: derived from `SECOND_MS` and the unit counts; `WHOLE_DOLLARS_FROM`, `DECIMAL_BELOW`; `SECOND_MS` exported and used by `stepSpeed`. |
| R2-9 | `src/domain/usage.ts:10,14` | The rate-limit reading's type spelled twice. | Fixed: `LimitReading`. |
| R2-11 | `src/state/bridge.ts:17-22` | A shuttle's call reducer was an inline spread at the call site (§15: named reducers replace them). | Fixed: `withShuttleCall` in `domain/fleet.ts`. |
| R2-12 | `src/forcefield/index.ts:3-5,14,17`, `src/ui/index.ts:2` | Barrel exports used nowhere: `Directive`, `plainMeasure`, `joinDir`, `ModuleProps`. | Fixed: removed from the barrels. |
| R2-13 | `src/ui/modules/parts/` | Three public files with no `index.ts`; modules imported them by deep path. | Fixed: barrel added. |
| R2-14 | `src/forcefield/classify.ts:10,22,50` | `Step`, `folderStep` and `applyStep` clash with `domain/fleet.ts` `applyStep` and with the step of a model request. | Fixed: `Effect`, `folderMove`, `applyEffect`. |
| R2-15 | `src/forcefield/shell.ts:18` | Boolean tuple label `allowsTabs`. | Fixed: `hasDash`. |
| R2-39 | `src/domain/mission.ts:28` | `inSubagent` lacks a boolean prefix. | Not fixed: it mirrors the stored `Check.inSubagent`. |

## Tests

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R2-22 | `tests/events/agents.test.ts:5` | A `describe` of 63 lines. | Fixed: split into shuttles and council. |
| R2-23 | `tests/forcefield/measure.test.ts` | Only the measure parsers were tested. The measurers that run through `$` (reset, stash, branch, push, clean, find) were not. | Fixed: six kit tests in `tests/events/holds.test.ts` ("measures: …"). |
| R2-24 | `tests/events/*` | Round 1's R1-28 gaps: `turn.step` timing, probes, the SessionMode label (Autopilot), the catch-all `command.run`. | Fixed: `jumps.test.ts` "steps" (Warp `0.5s · 50 tok/s`, a probe), `pane.test.tsx` Autopilot, `command.test.ts` `◐ /compact` then standby. |
| R2-25 | `tests/events/forcefield.test.ts:6-23`, `holds.test.ts:6-18`, `ui/pane.test.tsx:31`, `events/command.test.ts:53` | Two near-identical fake shells; the directives path repeated as a literal. | Fixed: `shellAnswer` and `PROJECT_DIRECTIVES` in `tests/support/world.ts`. |
| R2-26 | `tests/support/drive.ts:5-6` | Two-line comment. | Fixed: one line; `slashCommand()` and `modeRequest()` added. |
| R2-27 | `tests/events/forcefield.test.ts:72` | R1-30 is still open: in the kit a refused prompt arrives as an errored result, so the settle logs "cleared". | Not fixed: needs a check in a real session. |
| R2-28 | `src/state/atoms.ts:61`, `src/state/session.ts:57` | `migrateState` and `followSession` have no kit test. | Not fixed: the kit's test `$` cannot preset state, and `world` answers one session id. |

## Docs

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R2-17 | `src/forcefield/shell.ts:66` | `segmentsOf`'s comment left out the lone `&` and `\|&`. | Fixed. |
| R2-29 | `docs/architecture.md` §4 rules 5–6, §5, §8, §9 | `Held` for `ActiveHold`, `surface.ts` for `status.ts`, `endTransmission(advice…)`, `CLASSIFIERS` as a `Record`, loop variable `segment`, UI widths in `theme.ts`, `Directive` in the barrel. | Fixed. |
| R2-30 | `docs/architecture.md` §3 | The tree lacked `parts/index`, the new guards, `SECOND_MS` and `WRITERS`. It also lists `NOTICE` files that do not exist. | Fixed, except `NOTICE`, which is left to the license step (R1-1). |
| R2-31 | `docs/glossary.md` | Pane words used as identifiers and in comments (helm, warp, scanning, debrief, fuel, power, sensors, protocols, airlock) were not defined. | Fixed: added. |
| R2-32 | `README.md:137` | "A shuttle's Hull", but a shuttle card has no Hull row: the hull is the ↑ on its Fuel row. | Fixed wording. |
| R2-33 | `claude-code/AGENTS.md`, `docs/architecture.md` §11, §15 | Test support lists, and a §15 entry for this round with the two declared changes. | Fixed. |

## Nits

| Id | Where | What | Outcome |
| --- | --- | --- | --- |
| R2-16 | `src/forcefield/shell.ts:101` | `new Set()` built on every `time` prefix. | Fixed: `NO_VALUE_OPTIONS`. |
| R2-18 | `src/forcefield/classify.ts:15` | `TRAILING_REDIRECTS` kept a `\|\s*&` branch that is dead now that a lone `&` splits the line. | Fixed; golden classification unchanged. |
| R2-19 | `src/events/tools.ts:44,141-148` | `e.tool_use_id ?? ''` for an id already known, and `id` tested three times. | Fixed: early return; `recordVerdict` takes `{ id, decision, blockedBy }`. |
| R2-20 | `src/events/render.tsx:86` | The literal `'skywatch'` matcher silently duplicates `PANE_ID`. | Fixed: one-line why comment. |
| R2-21 | `src/ui/widgets.tsx:16-19` | Constants declared after the first function. | Fixed. |
| R2-38 | `src/**` | Some one-line doc comments restate the name (`ModuleFrame`: "A module: its frame, title row and body"). | Not fixed: churn with no gain. |
| R2-40 | `src/forcefield/index.ts`, `src/domain/shields.ts:34` | Some exports exist only for tests (`HOME_SCRIPT`, `allUnder`, `cleanArgs`, `trimRecent`'s `max`, …). | Not fixed: acceptable test seams. |

## Checked and unchanged

- Hook order, matchers, `bestEffort` placement, the held-call `finally`, the hand-back and `Agent` exits in `tool.call`, and when the status is refreshed: same as the old code.
- `turn.start`, `turn.step` and `turn.complete` (bridge, council, shuttle, probe), `session.*`, both `command.run` hooks, and `agent.*` against `starbase.tsx`.
- Shuttle card widths (`room`, name width), probe dot count, status words, glyphs and colours against the old closures.
- Measure scripts and argv: paths reach bash only as arguments; git runs with the config overrides; refspecs and branches cannot start with `-`; `find` refuses its other actions.
- Layers import downward only, through barrels; no `$` in objects, tables or arrow constants; no dynamic import; files under 300 lines; no function or `describe` over 50 lines.

## Gate results (last run)

| Gate | Result |
| --- | --- |
| `npm run check` | exit 0: Biome checked 128 files, no diagnostics; tsc no errors |
| `npm test` | 244 pass, 0 fail, 29 files (was 233) |
| `npm run validate` | exit 0, no diff against `scripts/validate-baseline.txt` |
| `sh scripts/golden.sh` | exit 0; `tests/support/golden.ts` byte-identical to before this round |
