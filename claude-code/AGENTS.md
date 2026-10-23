# SkyWatch for Claude Code: agent notes

The plugin folder that ships. User docs: [README.md](README.md). Repo rules: [../AGENTS.md](../AGENTS.md), [../docs/conventions.md](../docs/conventions.md). Structure: [../docs/architecture.md](../docs/architecture.md).

## Layout

`hooks/hooks.json` names `hooks/skywatch.ts`, which registers `src/events`. Layers, lowest first: `src/core`, `src/domain`, `src/forcefield`, `src/state` and `src/ui`, then `src/events`. A layer imports only lower layers, through their `index.ts`.

## Mod runtime rules

- Every file the entry imports is `.ts` or `.tsx`, imported with a static `import`. A dynamic `import()` stops the module from loading.
- The module has no DOM and no Node. Everything outside it goes through `$` (state, store, process, fs, clock, UI).
- JSX compiles against the global `h`. Elements come from `$.ui.resolve(e)`, never from imports.
- `read` and `update` work only on atoms declared in the same file by a literal ref: all 13 live in `src/state/atoms.ts`, behind `get<Key>` and `patch<Key>`.
- A function that takes `$` is a top-level `function` declaration with `$` first. `$` never goes into an object, a table or an arrow `const`; dispatch over such functions is a `switch`.
- Hook matchers (`{ component: 'Pane', requestId: 'skywatch' }`) and `$.command.register`'s name are string literals.
- A `Client` element's `module` is a string literal relative to the file that holds the JSX. Only `src/ui/widgets.tsx` draws them (`./clients/clock.tsx`, `./clients/loader.tsx`).
- Tool hooks keep their verdicts apart from bookkeeping: writes and logs run through `bestEffort`, so a failing write never lets a blocked call through.
- Client modules run on the drawing thread without `$`. They may import pure modules only: nothing that imports `claude-code` at run time or calls `$`.
- `$.state` keys are declared in `types/index.d.ts`, the state contract. It imports nothing. A new key goes there first, and changes `scripts/validate-baseline.txt`.
- A render hook never writes state. Pane buttons write through `paneActions($)`.
- Module variables reset on every reload. Per-load memory lives in the `Runtime` (`src/events/runtime.ts`); per-session state in `$.state`; state that outlives the session in `$.store`.
- `.claude-plugin/types/` is written by the engine when it loads the mod from a hot-reloaded folder. It is git-ignored; never edit it.

## Tests

- `claude plugin test .` runs `tests/**/*.test.ts(x)` with the engine's kit.
- `tests/support/world.ts` answers the engine's nouns for the mod's hooks: clock, store, ui, session, fs and process; `shellAnswer` fakes the force field's scripts, and `runTools` runs the calls the mod lets through. The test's own `$` cannot call `session.cwd`, so drive measures through `$.tool.call`, and read what was held from the pane inside a `classic.PermissionRequest` hook.
- `tests/support/golden.ts` holds the pre-refactor outputs for `tests/support/corpus/`. Regenerate it with `sh scripts/golden.sh` from the repo root; never edit it.
- `tests/support/drive.ts` builds the kit's inputs (`START`, `slashCommand()`, `skywatch()`, `spawn()`, `complete()`, `measured()`, `sessionEnd()`, `assistantRow()`, `paneRequest()`, `bandRequest()`, `hintRequest()`, `modeRequest()`) and `heldTexts()`, which reads the pane while a held call's prompt is up; `tests/support/fixtures.ts` holds stored values in older shapes for every state key.

## Check before you commit

```sh
npm run check      # from the repo root: Biome and tsc
npm test
npm run validate   # validate's hooks, calls and state keys against scripts/validate-baseline.txt
```
