# SkyWatch architecture brief

## Goal

Re-architect SkyWatch, a Claude Code mod, as a full refactor. Behaviour stays the same for the user; the code gets a proper folder structure, small single-purpose files, reusable helpers, consistent names, minimal comments, typed code, tests and modern dev tooling.

## What the product does

SkyWatch watches a Claude Code session and shows it with a starship theme ([glossary](glossary.md)):

- **Hazard scale.** How full the context window is, in 8 steps (Clear space … Event horizon). Shown as a **viewscreen** band above the prompt (gauge, last jump's context delta, duration, tok/s, animated loader), as a **beacon** status entry, or off. On the terminal the beacon goes on the prompt hint line instead of the status entry.
- **Pane** (docked beside the transcript) with modules in a user-chosen order: `bridge`, `council`, `shields`, `shuttles`, `probes`, `mission`, `blackbox`. A module with nothing to show takes no room.
  - **Bridge**: main model, effort, permission mode, context gauge, request count, compactions, request speed (last and average), the current task-list step or tool call, shuttle counts, and (desktop only) an SVG timeline of shuttle flight paths.
  - **Council**: advisor/architect consultations (transmissions) on a timeline, the inferred moment of each (before a plan, error repeats, before done), the last advice text.
  - **Shields**: every permission check by verdict (rule, ask, cleared, refused, deny, blocked), grouped into configurable decks with hotkeys; the force field's held/refused/blocked counts; the risky call currently held, with a live wait clock and its measure.
  - **Shuttles**: one card per subagent: effort, model, tokens, step count, live clock, current step, final answer (foldable), last tool. Docked shuttles fold to one line; number keys open them.
  - **Probes**: dots for model loops no shuttle claims.
  - **Mission**: session totals (tokens, cost, calls, active time, first seen), rate limits with reset times, the running jump and the last jump.
  - **Black box**: an event log, newest first, 10 entries at a time, per-shuttle filter when the person views a shuttle.
- **Force field.** Before a Bash call runs, classify it for risky commands (rm -rf, git reset --hard / clean / push --force / branch -D / stash drop, find -delete, docker/kubectl/helm/terraform deletes, package publish, PR merge, DB migrations and destructive SQL) and dotenv secret files. User **directives** (`pass|hold|block` for a group like `@delete` or a command glob) from `~/.claude/skywatch.directives` and `.claude/skywatch.directives`, last match wins over built-in defaults. `hold` measures the change with read-only commands (bash path counting, git plumbing with hooks/pagers/filters disabled, find without -delete), then turns the permission verdict into an `ask` with the measure as the reason. `block` turns it into a `deny`. rm only inside temp folders passes. Quote-, heredoc-, subshell-, `cd`/`pushd`/`git -C`-aware.
- **Slash command** `/skywatch [launch|dock|recalibrate|hazards <mode>|directives]`.
- **Settings** (`userConfig`): `modules`, `decks`, `autoLaunch`, `hazards`.
- **Redaction.** Tool summaries stored in state have credentials masked.
- **Persistence.** Session totals go to `$.store` per session id so they survive restarts; everything else is session state (`$.state`) with schema-version migration that normalizes older shapes.

## Runtime constraints (non-negotiable)

- The mod runs inside Claude Code's mod engine: no DOM, no Node, no npm runtime dependencies. Everything outside goes through the engine interface `$` (`$.state`, `$.store`, `$.process.run`, `$.fs.read`, `$.clock.now`, `$.session.*`, `$.ui.*`, `$.command.register`).
- `hooks/hooks.json` names exactly one hooks module exporting `register(on, options)`. That module and every file it imports are `.ts/.tsx/.js/.mjs` ES modules imported with static `import` declarations (no dynamic `import()`). Subfolders are fine.
- Hooks: `on(event, matcher?, ($, e, next) => …)`. Events used: `session.start`, `session.end`, `command.run` (own command and all commands), `agent.offer`, `agent.spawn`, `turn.start`, `turn.step` (async generator, streams chunks), `turn.complete`, `session.measure`, `tool.check`, `tool.call`, `session.append`, and `ui.render` for `SessionMode`, `PromptHint`, `AbovePrompt` and `Pane`.
- State: `atom(ref, initial)`, `read($, atom)`, `update($, atom, fn)` from `'claude-code'`. Keys must be declared in `types/index.d.ts` (a self-contained `.d.ts`, no imports) under `interface PluginState { skywatch: {...} }`. Current keys: `meta, bridge, usage, council, shields, shuttles, probes, blackbox, jump, lastJump, view, councilRoster, totals`. Keep the keys and shapes compatible with stored data (a schema-version migration exists).
- Render hooks may not write state. JSX compiles against global `h`; elements (`Box`, `Text`, `Button`, `Svg`, `Client`) come from `$.ui.resolve(e)`.
- `Client` elements run small self-contained surface modules (a live clock, an animated connector line) on the drawing thread without `$`. Their `module` prop is a string literal path relative to the file containing the JSX.
- Module-level variables reset on every hot reload; per-session values must live in `$.state` or the `register` closure.
- `claude plugin validate <dir>` reads the source statically and lists hooks, `$` calls and state keys; `claude plugin test <dir>` runs `*.test.ts(x)` files with the engine's test kit (`claude-code/testing`: `test`, `expect`, `mock`, `$.ui.mount`), in an environment with no fs, network or process.
- API types (`claude-code`) are written by the engine into `.claude-plugin/types/` (git-ignored) when the mod is loaded in development; there is no npm package for them.

## Current state (problems to fix)

Four source files plus two tiny client modules, all in `hooks/`:

- `starbase.tsx`, 1614 lines: atoms and state readers, directive loading, risk measuring, all 17 hook handlers, and the whole pane UI. The pane render handler alone is ~700 lines of closures inside a ~1150-line `register`.
- `core.ts`, 740 lines: pure helpers grouped only by banner comments (defaults, config parsing, directives, colours, formatting, hazard scale, redaction, tool/deck matching, shields reducers, council reducers, shuttle/probe reducers, text extraction).
- `forcefield.mjs`, 624 lines, untyped JS in a different code style: command classification (one 165-line function with a long if-chain over ~15 tools) plus dry-run measuring via bash/git/find.
- `clock.tsx`, `loader.tsx`: client modules.
- `types/index.d.ts`: state contract.

Recurring problems: heavy duplication (46 copies of normalize-then-spread inside `update`, shuttle list update pattern copied 6 times, 4 capitalize helpers, plural and segment-split logic repeated, frame/gauge UI repeated), parallel ternary chains instead of lookup tables, single-letter names for domain objects, synonyms for one concept, module-level mutable per-session state, magic numbers, verbose narrative comments, two types for one concept, no tests, no lint/format/type-check tooling. Full list: [code-review-findings.md](code-review-findings.md).

## Tooling decisions already made

- TypeScript strict everywhere (port the `.mjs` file), `noUncheckedIndexedAccess`.
- Biome for format and lint, run from a root `package.json` (dev-only; nothing under `claude-code/` depends on npm).
- Tests with the engine's kit via `claude plugin test claude-code`, focused on pure logic (classification, directives, redaction, formatting, reducers) plus a few UI mount tests.
- `claude plugin validate` output (hooks, calls, state keys) must stay the same apart from file paths.

## What the architecture document must give

1. A folder and file tree for `claude-code/` with one line per file saying what it owns, every file under ~300 lines.
2. Layering and dependency rules (pure core vs. `$` adapters vs. hooks vs. UI), and which direction imports may go.
3. How state access works without per-call boilerplate (a typed helper over `atom`/`read`/`update` with normalization in one place).
4. How hook handlers are organized (one file per event family) and how they get config and per-session context without module globals.
5. How the pane UI is split into components and shared primitives, and how modules are picked without nested ternaries.
6. How the force field is split (classify, per-tool classifiers, measure, temp-folder check) and typed (a `Risk` union).
7. Where constants, colours/theme and limits live; where domain types live vs. the state contract.
8. Test layout and what to cover first.
9. Dev tooling files at the repo root and their scripts.
10. A migration order for the refactor that keeps the mod loadable after each step.

Write it as `docs/architecture-draft.md`: plain, concise, no source code beyond short signatures and trees.
