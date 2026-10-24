# SkyWatch for Claude Code

**A starbase for your Claude Code session.** A pane beside the transcript runs the session from orbit: the bridge's readings, shields on every permission check, a card for each shuttle you launch, the mission's running totals and a black box that records it all. Above the prompt, a hazard scale tells you how full the context is, from Clear space to the Event horizon. Every number comes from a real session event, and nothing leaves your machine.

A Claude Code mod. It needs Claude Code 2.1.287 or later.

## Install

From GitHub:

```sh
claude plugin marketplace add v-five/skywatch
claude plugin install skywatch@v-five
```

Or from a local copy, for development:

```sh
claude --plugin-dir ./skywatch/claude-code
```

## The hazard scale

How full the context window is. The band above the prompt, the header's radar `◎`, every gauge in the pane and the loaders all take the step's colour.

| Context used | Hazard |
| --- | --- |
| under 10% | `✦` Clear space |
| under 25% | `∙` Stardust |
| under 40% | `≈` Nebula |
| under 55% | `☁` Gas cloud |
| under 70% | `∴` Debris |
| under 80% | `☄` Asteroid field |
| under 90% | `ϟ` Ion storm |
| 90% and up | `◉` Event horizon: compaction is near |

`hazards` picks where it shows:

- **viewscreen**: a band above the prompt, with how much the last jump added, how long it took and how fast it wrote, and a loader while the session works.
- **beacon**: one short status entry, such as `skywatch ☁ Gas cloud · ◑ 54%`.
- **off**: neither.

## The modules

| Module | Shows |
| --- | --- |
| `⌬` Bridge | the main model: Helm (effort, model, mode), Hull (context), Warp (request speed), what it is Scanning now, the Shuttles count and, while one flies, each shuttle's flight time as a gauge against the longest |
| `⟁` Council | when an architect or advisor agent was consulted, and its last transmission |
| `⛨` Shields | every permission check: Sensors (the latest checks), Protocols (your Claude Code rules), Airlock (prompts you answered; Autopilot in auto mode), Force field (what your directives held or blocked) and Decks (by kind of tool) |
| `⊹` Flight plan | the bridge's task list: each step done, in progress, pending or skipped (dropped before it was done), with progress in the title. Steps that share a name before `:` (`Fix findings: force field`, `Fix findings: domain`) form a phase; a finished phase folds to one line |
| `⇡` a shuttle | one card per subagent, titled from its mission ("Implement the footer component" reads `Footer builder`): its Mission, its Brief (the prompt it was given), Helm (effort, type, model), Fuel with its flight time, Scanning or its Debrief once docked, and its last tool. A card in flight is open until you fold it; docked shuttles land in the Hangar, one line that opens to their folded cards |
| `◌` Probes | model loops no shuttle claims, such as workflow agents |
| `✧` Mission | the whole session: Fuel (tokens, cost, calls), Flight time, Power (5-hour and 7-day limits), the Jump running now and the Last jump |
| `▣` Black box | what happened, newest first, ten at a time |

A module's title row shows the loader while its work runs, and ends with a `▲` that folds the module to that row (`▼` opens it again). Long text folds to two lines with a `▼` on its last line to open it.

## Directives

The Force field acts on risky commands by your directives. Each directive gives a mode to a group of commands, or to a command you name:

| Mode | What happens |
| --- | --- |
| `pass` | Claude Code decides, as it would without SkyWatch |
| `hold` | it goes to the permission prompt, with what it would change shown on the Shields module and a timer |
| `block` | it's refused, and Claude is told which directive refused it |

**Groups** are the commands SkyWatch knows how to spot and measure:

| Group | Default | Covers |
| --- | --- | --- |
| `@delete` | `pass` | `rm`, `find -delete`, `find -exec rm`, `xargs rm`, `git clean` |
| `@secrets` | `hold` | reading or changing a `.env` file |
| `@git-history` | `hold` | `git reset --hard`, `git checkout` over changes, `git push --force`, `git branch -D`, `git stash drop` and `clear` |
| `@publish` | `hold` | publishing a package (npm, yarn, pnpm, bun, cargo, gem, twine, poetry), merging a PR, deleting a release or repository |
| `@infra` | `hold` | Docker and Podman deletes and prunes, `kubectl delete`, `helm uninstall`, `terraform destroy` |
| `@database` | `hold` | migrations, database drops and resets, SQL `DROP`, `TRUNCATE` or `DELETE` without `WHERE` |

Nothing is blocked unless you say so. Write directives in `~/.claude/skywatch.directives` for every project, or `.claude/skywatch.directives` for one:

```
# mode   group or command
hold     @delete
block    git push origin main     # a command matches as typed, at the start of each part of a shell line
pass     rm /tmp/*                # * matches anything
```

The last directive that matches wins: SkyWatch's defaults come first, then your file, then the project's. A held `rm` whose targets are all inside `/tmp` or `$TMPDIR` passes unless a directive names the command. The Force field row counts blocked commands once you have a `block` directive. In auto mode, Claude Code's classifier may answer a held command instead of you; only `block` can't be answered.

`/skywatch directives` lists the directives in force, where each came from, and any line it couldn't read.

## Commands

| Command | Does |
| --- | --- |
| `/skywatch` or `/skywatch launch` | launch the pane |
| `/skywatch dock` | close it |
| `/skywatch recalibrate` | clear the shuttles, checks, transmissions, the black box and the jump; fuel, power and compactions stay |
| `/skywatch hazards viewscreen\|beacon\|off` | change the hazard scale for this session; without a value, show it |
| `/skywatch directives` | reload and list the directives |
| `/skywatch palette` | list each surface's palette, the colours the palette files set, and lines they could not read |


## Settings

In `/config`, or under `pluginConfigs["skywatch@v-five"].options` in `settings.json`:

| Setting | Default | Meaning |
| --- | --- | --- |
| `hazards` | `beacon` | `viewscreen`, `beacon` or `off` |
| `autoLaunch` | `true` | launch the pane when a session starts |
| `modules` | `bridge,plan,council,shields,shuttles,probes,mission,blackbox` | the modules, in order; leave one out to hide it. `app=bridge,mission; terminal=bridge,shields` gives each surface its own |
| `palette` | `skywatch` | the colours; `app=…; terminal=…` gives each surface its own (see [Palettes](#palettes)) |
| `decks` | `file,shell,other` | Shields decks, from `file`, `git`, `shell`, `web`, `agents`, `app` and `mcp`; `other` takes the rest |

## Palettes

| Palette | Colours |
| --- | --- |
| `skywatch` | SkyWatch's own hex scale |
| `terminal` | the terminal's 16 colours, so the terminal's theme (Catppuccin, Dracula, Nord…) paints it |
| `claude` | Claude Code's theme colours for the modules and results; the hazard scale in the terminal's colours |
| `catppuccin-mocha`, `catppuccin-macchiato`, `catppuccin-frappe`, `catppuccin-latte` | Catppuccin; `catppuccin` alone is Mocha |
| `dracula`, `nord`, `gruvbox`, `tokyo-night` | those themes' colours |

`~/.claude/skywatch.palette`, then the project's `.claude/skywatch.palette`, recolour single parts over the chosen palette, one `name = colour` per line, `#` for comments. A colour is a hex value, a terminal colour name (`green`, `cyanBright`) or a Claude Code theme key (`success`).

```
# a hazard step recolours the modules drawn from it
ion-storm = #fab387
# a module or result recolours only itself
shields = green
```

Steps: `clear-space`, `stardust`, `nebula`, `gas-cloud`, `debris`, `asteroids`, `ion-storm`, `event-horizon`. Parts: `bridge`, `shuttles`, `shields`, `council`, `allowed`, `cleared`, `waiting`, `stopped`, `blocked`, `held`, `alert`, `dim`, `faint`, `text`. The desktop app draws terminal colour names its own way, so `terminal` suits the terminal best.

## What it can reach

| It sees | Through |
| --- | --- |
| every tool call's name and input, and whether it failed | `tool.call` |
| every permission verdict | `tool.check` |
| subagent spawns, their requests, token usage and final answers | `agent.spawn`, `turn.step`, `turn.complete` |
| your prompts, up to 300 characters, for the black box | `turn.start` |
| context, cost and rate-limit readings | `session.measure`, `$.session.usage()` |
| advisor tool calls in the assistant's responses (their content is encrypted) | `session.append` |

What it does with that:

- **Acts on your directives.** A held command goes to the permission prompt, and a blocked one is refused. SkyWatch never runs or rewrites a command itself.
- **Measures before holding.** To show what a held command would do, it runs read-only commands in the session's folder: a short `bash` script that resolves and counts the paths `rm` would remove, `git` in dry-run or plumbing form (`clean -n`, `diff-files`, `diff-index`, `rev-parse`, `log`, `rev-list`, `stash list`) with hooks, filters, pagers and signing turned off, and `find` without `-delete`.
- **Reads your directives.** It reads `~/.claude/skywatch.directives` and `.claude/skywatch.directives`, and asks the shell for your home folder to find the first.
- **Keeps state.** Short summaries (a tool name plus a path or command, with credentials masked) live in session state, which ends with the session. The mission's token, cost and time totals are kept on this machine, so they survive a restart.
- **Nothing else.** No network requests, no model calls, no file writes. `claude plugin validate .` prints exactly what it hooks and calls.

## What is inferred, not measured

- **Council moments.** "Before a plan" means no edits yet this jump, "error repeats" means two or more errors in a row, "before done" means edits were made. They are marked `(inferred)`.
- **Server-side advice is encrypted.** For a server tool such as Claude Code's `advisor`, SkyWatch counts and times the transmission but cannot show what it said.
- **A shuttle's ↑ on its Fuel row** is its hull: its latest request's whole input. The API has no per-agent cost.
- **Probes** can't tell a workflow agent from a compaction fork; both are loops no shuttle claims.
- **Warp** is timed at SkyWatch's own `turn.step` hook, so it includes everything beneath it: other plugins, the engine, the network and any retry.

## Troubleshooting

- **The pane doesn't appear.** Run `/reload-plugins`, then `/skywatch`. Below 144 columns, Claude Code won't seat a pane nobody asked for, but `/skywatch` launches it at any width.
- **Something failed.** Look in the transcript for a dim line starting `skywatch:`. It names the hook that failed or why the pane was refused.
- **A directive does nothing.** Run `/skywatch directives`: it lists the lines it couldn't read.
- **Counts look stale.** Run `/skywatch recalibrate`.

## How it works

| Path | Holds |
| --- | --- |
| [`hooks/skywatch.ts`](hooks/skywatch.ts) | the entry `hooks/hooks.json` names: reads the settings and registers the hooks |
| [`src/core/`](src/core/) | settings, formatting, redaction and small guards, as pure functions |
| [`src/domain/`](src/domain/) | defaults, normalizers and reducers for every state value |
| [`src/forcefield/`](src/forcefield/) | which commands are risky, the directives, and the read-only measures of what they would change |
| [`src/state/`](src/state/) | the state values and the actions that read and write them |
| [`src/ui/`](src/ui/) | the pane, its modules, the viewscreen and the beacon; `clients/` holds the loaders and live clocks, which redraw only themselves |
| [`src/events/`](src/events/) | the event hooks, one file per family |
| [`types/index.d.ts`](types/index.d.ts) | the state contract |
| [`tests/`](tests/) | tests for core, domain, the force field, the UI and the main hook flows, run with `claude plugin test` |

Develop with:

```sh
claude --plugin-dir .      # load it; edits hot-reload
claude plugin validate .
claude plugin test .
```

Code rules and the architecture are in the repository's [`docs/`](https://github.com/v-five/skywatch/tree/main/docs).

## Thanks

Inspired by [Flightdeck](https://github.com/scasella/claude-flightdeck) by Stephen Casella.

## License

[Apache-2.0](LICENSE). Attributions are in [NOTICE](NOTICE).
