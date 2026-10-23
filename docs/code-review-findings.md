# SkyWatch code review: full findings

Scope: whole repository at `15fa9f6`. Focus: structure, reuse, naming, clean code, comments, file length, folders.
Paths are relative to `claude-code/`. Ordered by severity within each group.

## Correctness

1. `hooks/starbase.tsx:1293` — Deck button count sums `rule + ask + cleared + refused + deny` and leaves out `blocked`. The header's `s.total` (from `shieldsSummary`) includes `blocked`, so the deck numbers do not add up to the total once a directive blocks something. Use one tally sum helper for both.
2. `hooks/core.ts:64` — `normalizeShields` normalizes `held` against `{ ran: 0, refused: 0 }`, not `DEFAULT_SHIELDS.held`, so `blocked` stays `undefined` for older state. Every reader then patches it with `held.blocked ?? 0` and `g.held ?? { ran: 0, refused: 0 }` (`starbase.tsx:669`, `:696`, `:1245`, `:1283`; `core.ts:591`). Fix the default once; make `held` and `Tally.blocked` non-optional in the type.
3. `hooks/starbase.tsx:1517` — Black box fold key is `log-${l.at}-${i}`, and `i` is the index in a newest-first list. Each new entry shifts every index, so an unfolded line folds again and stale keys fill `unfolded` (kept to 30). Key on `l.at` (plus `who`) only.
4. `hooks/starbase.tsx:161`, `:350`, `:376`, `:443` — Module-level mutable state (`surfaceNow`, `directives`, `directiveErrors`, `modeSeen`, `risky`) lives outside `register`, while `callCraft` lives inside it. If the host loads the module once for several sessions, one project's directives and surface leak into another. Keep per-session state in one place (the `register` closure or atoms).

## Structure, file length, folders

5. `hooks/starbase.tsx` (1614 lines) — One file holds atoms and state readers, directive loading, risk measuring, every hook handler and the whole pane UI. The `Pane` render handler alone runs from `:913` to `:1613` (~700 lines) inside `register` (`:459`–`:1614`, ~1150 lines). Split it, for example: `state/atoms.ts`, `state/readers.ts`, `shields/directives.ts`, `shields/risk.ts`, `hooks/session.ts`, `hooks/tools.ts`, `hooks/agents.ts`, `ui/viewscreen.tsx`, `ui/pane.tsx`, `ui/modules/{bridge,council,shields,shuttles,probes,mission,blackbox}.tsx`, `ui/primitives.tsx` (row, rowBlock, clamp, head, frame, ruler, bar).
6. `hooks/core.ts` (740 lines) — Grab-bag of unrelated pure helpers, already sectioned by banner comments: defaults, config, directives, colours, formatting, hazards, redaction, tools/shields, council, shuttles, layout. Each banner is a file: `core/defaults.ts`, `core/config.ts`, `core/directives.ts`, `core/theme.ts`, `core/format.ts`, `core/redact.ts`, `core/shields.ts`, `core/council.ts`, `core/shuttles.ts`, plus an `index.ts` barrel.
7. `hooks/` folder — Holds everything: the hooks entry, pure logic (`core.ts`), shell risk analysis (`forcefield.mjs`) and two client UI components (`clock.tsx`, `loader.tsx`). Only `starbase.tsx` is a hooks module (`hooks.json` lists only it). Group by role: `src/core/`, `src/shields/`, `src/ui/clients/` (clock, loader), with `hooks/starbase.tsx` as a thin entry.
8. `hooks/forcefield.mjs` (624 lines) — Two concerns in one file: classifying a command (`:26`–`:332`) and measuring it with git/find/bash (`:334`–`:624`). Split into `classify` and `measure` files.
9. `hooks/forcefield.mjs:144`–`:308` — `classifySegment` is ~165 lines: prefix stripping, then one long `if (cmd === ...)` chain for rm, git, find, xargs, docker, kubectl, helm, terraform, npm, cargo, gh, rails, alembic, prisma, django. Extract `stripPrefixes(words)` and a `CLASSIFIERS: Record<string, (args, dir) => Risk | null>` table, one small function per tool.
10. `hooks/forcefield.mjs:145`, `:306` — The whole body of `classifySegment` sits inside a bare `{ ... }` block. Dead nesting; remove the braces.
11. No tests — `core.ts:1`–`:3` says every behaviour is "testable directly", but the repo has no test files. `parseDirectives`, `directiveFor`, `groupOf`, `classifyAll`, `maskQuotes`, `stripHeredocs`, `redact`, `prettyModel`, `taskOf` are pure and high-risk. Add a `tests/` folder.

## Reuse and duplication

12. `hooks/starbase.tsx` (46 places) — `update($, atom, x => ({ ...normalize(DEFAULT_X, x), ... }))` is repeated everywhere, sometimes with `normalize` called twice in one expression (`:230`, `:454`, `:592`, `:827`, `:1301`, `:1330`). Add one `patch($, atom, def, fn)` helper (or `patchBridge`, `patchView`, ...) that normalizes once.
13. `hooks/starbase.tsx:316`, `:599`, `:729`, `:839`, `:144`, `:791` — `listOf<unknown>(list).map(normalizeShuttle).map(c => c.id === id ? ... : c)` repeated. Add `updateShuttle($, id, fn)`.
14. `hooks/core.ts:265`, `:280`, `:429`; `hooks/starbase.tsx:977` — Four copies of "capitalise first letter": `cap` in `prettyModel`, `writerName`, `capital`, and `cap` in the pane. Keep one exported `capitalize`.
15. `hooks/clock.tsx:9`–`:13` — `fmt` is a byte-for-byte copy of `core.fmtTimer` (`core.ts:316`). Import it, if the client module loader allows relative imports; otherwise note why it is copied.
16. `hooks/starbase.tsx:207`–`:208` — `transmissionEnded` re-implements `core.adviceLine` (first non-empty line, strip markdown markers, shorten to 160) with slightly different rules. Call `adviceLine`.
17. `hooks/starbase.tsx:478`–`:486` — `session.start` copies the usage-to-state mapping from `recordUsage` (`:261`–`:268`). Extract `usageFrom(u)` and use it in both.
18. `hooks/starbase.tsx:1050` — `moduleFrame` exists, but only `probesModule` uses it. `bridgeModule` (`:1131`), `councilModule` (`:1171`), `shieldsModule` (`:1249`), `missionModule` (`:1439`) and `blackboxModule` (`:1497`) inline the same bordered `Box` + `head(...)`.
19. `hooks/starbase.tsx:880`–`:894` — The viewscreen draws a gauge by hand; the pane's `bar` (`:980`) does the same. Hoist `bar` to a shared UI helper.
20. `hooks/forcefield.mjs` (10 places, e.g. `:398`, `:401`, `:441`, `:457`, `:493`, `:533`, `:540`, `:554`, `:575`) — `${n} ${n === 1 ? "file" : "files"}` repeated. `core.plural` already does this.
21. `hooks/core.ts:195`–`:199` and `hooks/forcefield.mjs:118` — Same shell split regex `/&&|\|\||;|\||\n/` in two files. Export one `segmentsOf`.
22. `hooks/forcefield.mjs:471`–`:480` — Two identical `rev-parse --abbrev-ref HEAD` branches. Merge into `if (!branch || branch === "HEAD")`.
23. `hooks/core.ts:665`–`:676` — `applyStep` recomputes `ctx` with the same three-field sum that `stepTokens` (`:660`) already returns. Call `stepTokens(u).tokIn`.
24. `hooks/core.ts:221`–`:229` and `:291`–`:300` — Hazard hex values are written twice: once in `SPACE`, once in `HAZARD_SCALE`. Build `HAZARD_SCALE` from `SPACE` (add `debris`).
25. `hooks/starbase.tsx:1219`–`:1220`, `:1314` — Verdict to colour and verdict to word are two ternary chains over the same keys; `verdictColor` also has a dead branch (`refused ? C.stopped : C.stopped`). Use one `VERDICT_STYLE: Record<Verdict, { color, word }>`.
26. `hooks/starbase.tsx:1325`–`:1328`, `:1579` — Shuttle status to colour, word, glyph and SVG fill are four parallel ternary chains. Use one `SHUTTLE_STATUS` table.
27. `hooks/starbase.tsx:1535`–`:1548` — Seven-deep nested ternary picks a module renderer. Use `const MODULE_VIEWS: Record<Module, (w: number) => RenderChildren>`.

## Efficiency

28. `hooks/starbase.tsx:384`, `:414` — `riskOf` runs `classifyAll(command)`, then `measureRisk` runs it again on the same command. Pass `risks` in.
29. `hooks/starbase.tsx:393`–`:394` — `describeInput(e.tool, e)` computed twice for `command` and `headline`.
30. `hooks/starbase.tsx:1569`, `:1573`–`:1574` — `flightPathsSvg` calls `$.ui.resolve(e)` again (already in `els`) and slices `fleet.slice(-10)` twice; the IIFE in render reads poorly. Destructure `Svg` from `els` and make it a named function.

## Naming

31. `hooks/starbase.tsx` throughout — Single-letter names for domain objects: `a` (council), `g` (shields), `t` (jump), `m` (bridge), `r` (lastJump), `v` (view), `u` (usage), `lp` (probes), `tot`, `gg`, `l` (probe or log line), `C` (COLORS). `craftRows` takes a parameter `a` (`:1076`) that shadows the outer council `a`. Use `council`, `shieldState`, `jumpState`, `bridgeState`, ...
32. Terminology drift — One concept, several names: shuttle / craft / fleet (`callCraft`, `craftRows`, `craft`), jump / turn (`turn-clock` key, `turn.start`), council / architect (section banner `// ---- architect` at `starbase.tsx:1166` for `councilModule`). Pick one word per concept.
33. `hooks/forcefield.mjs:108`, `:118` — `classifyAll(raw)` loops with `for (const raw of ...)`, shadowing its own parameter. Rename the loop variable `segment`.
34. `hooks/forcefield.mjs:500` — `size(bytes)` is a vague name for a byte formatter sitting between two measurers. Rename `fmtBytes` and move it near `core` formatters.
35. Mixed style — `forcefield.mjs` uses semicolons, double quotes, braces on every `if`, and is untyped JS; the rest is TS with no semicolons, single quotes, one-line `if`. Untyped returns force casts like `String(r.kind ?? '')` (`starbase.tsx:386`). Port it to `.ts` and run one formatter.

## Types

36. `types/index.d.ts:4` vs `hooks/core.ts:399`–`:400` — Two types for one concept: `DeckName = string` and `Deck` (union). `starbase.tsx:1298` then casts `b as Deck`. Use `Deck` everywhere.
37. `types/index.d.ts:140` — `View.hazards` repeats the `'viewscreen' | 'beacon' | 'off'` literal that `core.HazardMode` already defines.
38. `hooks/core.ts:101`, `:107`, `:146`–`:148` — `Module`, `Config`, `HazardMode`, `DirectiveMode`, `Directive` are declared in `core.ts`; every other domain type is in `types/index.d.ts`. Keep types in one place.
39. `hooks/starbase.tsx:707`–`:708` — `String(e.tool) === 'SubagentHandback'` and `e as unknown as { message?: unknown }`: double cast escapes the type system. Add a typed guard.

## Comments

40. Stacked or misplaced doc comments (stale leftovers): `core.ts:257`–`:262` (one-line doc above a newer multi-line doc), `core.ts:658`–`:659` (`applyStep` doc sits above `stepTokens`), `forcefield.mjs:46`–`:51` (`classifyAll` doc sits above `stripHeredocs`; `classifyAll` at `:108` has none), `types/index.d.ts:6`–`:8` and `:138`–`:139` (two separate doc blocks for one declaration).
41. Comment volume — ~99 comment lines in `core.ts`, ~99 in `starbase.tsx`, ~56 in `forcefield.mjs`. Many are multi-line narrative that restates the code or reads as prose: `core.ts:1`–`:3`, `starbase.tsx:244`–`:246`, `:327`–`:330`, `:545`–`:546`, `:553`–`:554`, `:577`–`:578`, `:993`–`:994`, `:1011`–`:1012`, `forcefield.mjs:10`–`:13`, `:584`–`:586`. Keep only the "why" that code cannot say (security notes on git `-c` flags, the heredoc rule); cut the rest to one line or delete.
42. `hooks/core.ts:702`–`:704` — Empty `// ---- layout` banner followed by a double blank line; what follows is not layout. Remove it.
43. `hooks/starbase.tsx:1554` — Comment inside a `.map` block body that exists only to hold the comment; `ps.map((p, i) => { return (...) })`. Use an expression body.
44. Three banner styles: `// ------------- state` (`core.ts`, `starbase.tsx:87`), `// ---- the force field: ...` (`starbase.tsx:327`), `// ---- What counts as risky -----` (`forcefield.mjs:26`). Once files are split, drop banners.

## Clean code

45. Magic numbers — list caps `slice(-200)`, `-24`, `-40`, `-60`, `80`, `-20`, `-30`; blackbox column widths `9`, `13`, `16` (`starbase.tsx:1508`–`:1517`); `rightLen: 39 + ...` (`:1185`, a hand count of the text length); `w - 38` (`:1418`); compaction threshold `20_000` (`:253`); `timeoutMs: 15000` eight times in `forcefield.mjs`. Name them; compute `rightLen` from the string.
46. Redundant aliases — `const motion = hasClient` (`starbase.tsx:937`), `const C = COLORS` (`:461`), `const body = column(...)` (`:1596`), `const isReview = t.isReviewing` (`:1436`), `const open = v.deckOpen` (`:1247`).
47. Unused parameters — `noteAdvice($, cfg, advice)` (`starbase.tsx:215`) and `isCouncilType($, cfg, type)` (`:220`) never use `cfg`.
48. Imports — `starbase.tsx:5`–`:80`: a 73-line unsorted named import from `./core`, plus two separate `import type` lines from `./core` (`:78`, `:80`). Merge the type imports; a barrel per split module will shrink this.
49. Render-local helpers that belong in core — `ago` (`starbase.tsx:1429`), `speedText` (`:1069`), `EFFORTS`/`effortPct` (`:1063`–`:1064`); `effortBar` hardcodes `10` as the gauge width (`:1067`).
50. `hooks/starbase.tsx:1197`–`:1209` — JSX expression braces wrapping a plain `<Box>`; remove the `{ }`.
