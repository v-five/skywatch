# Conventions

Rules for all code in this repository. [`AGENTS.md`](../AGENTS.md) points here; the mod runtime rules are in [`claude-code/AGENTS.md`](../claude-code/AGENTS.md).

## Structure

- One concern per file. A file that needs banner comments to separate its sections must be split.
- Files stay under 300 lines. Functions stay under 50 lines. Generated test fixtures (`tests/support/golden.ts`) are exempt.
- Group files in folders by layer, then by domain inside the layer (`src/domain/fleet.ts`, `src/ui/modules/shields.tsx`).
- Pure logic never touches `$`. Code that calls `$` (state, process, fs, clock, UI) lives in thin adapters that call the pure code.
- Every folder with more than one public file has an `index.ts` barrel. Import from the barrel, not from deep paths across domains. Exceptions: `src/ui/clients/` (loaded by path) and `tests/support/`.
- Layers import downward only: `core`, `domain`, `forcefield`, `state` and `ui`, then `events`, then `hooks/skywatch.ts` ([architecture](architecture.md)).
- Exported functions are `function` declarations; arrow functions are for callbacks and file-private one-liners. Exception: a value typed by an engine function type (`register: Register`, a `ClientModule`) is a `const`.

## Reuse

- Search `core/` before you write a helper. One implementation per job: formatting, pluralising, capitalising, splitting shell lines, summing tallies.
- Map a closed set of values (verdicts, statuses, modules) with a `Record<Key, …>` table, not with ternary chains. Look up open strings (program names, writers) in a `Map`, never a plain object.
- No nested ternary deeper than two levels.

## Naming

- `camelCase` for values and functions, `PascalCase` for types and components, `SCREAMING_SNAKE_CASE` for module constants.
- Booleans start with `is`, `has`, `did`, `should` or `can`.
- No single-letter names, except loop indices (`i`, `j`) and one-line callbacks over an obvious collection.
- No name shadows an outer name.
- One word per concept, as listed in the [glossary](glossary.md). Do not mix synonyms (shuttle/craft, jump/turn, council/architect).

## Comments

- Default: no comment. A good name replaces it.
- Write a comment only for a "why" the code cannot say: a security reason, an engine limitation, a non-obvious rule.
- One line. No narrative paragraphs, no banner comments, no commented-out code.
- An exported function gets a one-line `/** … */` only when its name and types do not say enough.

## Clean code

- No magic numbers or strings. Name them as constants next to the code that uses them; a constant two layers share lives in the lower one.
- Compute widths and lengths from the strings they measure; never hand-count.
- No unused parameters, variables or exports. No redundant aliases (`const x = y`).
- No `as unknown as` casts. Narrow with a type guard.

## Types

- One type per concept. The `$.state` contract lives in `claude-code/types/index.d.ts`, which the engine requires; it imports nothing.
- Other domain types live with the module that owns them and are exported from its barrel.
- Prefer union literals and `as const` arrays over `string`.

## Style and tooling

- TypeScript everywhere (`.ts`, `.tsx`), strict mode, `noUncheckedIndexedAccess`.
- [Biome](https://biomejs.dev) formats and lints: single quotes, no semicolons, two-space indent. Run `npm run check` before committing.
- Tests use the engine's own kit (`claude-code/testing`) and run with `claude plugin test claude-code`.
- `claude plugin validate claude-code` must pass, and its list of hooks, calls and state keys must not change unless the change is intended.

## Git

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
- Behaviour changes and refactors go in separate commits.
