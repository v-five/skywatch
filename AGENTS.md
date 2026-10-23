# SkyWatch

A Claude Code mod: a pane and a hazard scale that show what a session is doing. See [README.md](README.md) for what it does and how to install it.

## Layout

| Path | Holds |
| --- | --- |
| `claude-code/` | The Claude Code port: the plugin folder that ships. Its own rules are in [`claude-code/AGENTS.md`](claude-code/AGENTS.md). |
| `.claude-plugin/marketplace.json` | The marketplace entry that points at `claude-code/`. |
| `docs/` | Conventions, glossary, the architecture brief, draft and final architecture, and review notes. |
| `scripts/` | `validate-snapshot.sh` with its baseline, and `golden.sh`, which regenerates the tests' pre-refactor outputs. |
| `package.json`, `biome.json` | Dev tooling only. Nothing here ships with the plugin. |

## Rules

- Code rules: [docs/conventions.md](docs/conventions.md).
- Words for concepts: [docs/glossary.md](docs/glossary.md).
- Architecture: [docs/architecture.md](docs/architecture.md).

## Commands

```sh
npm install                       # dev tools: TypeScript, Biome
npm run check                     # format, lint, type-check
npm test                          # claude plugin test claude-code
npm run validate                  # validate's lists against scripts/validate-baseline.txt (needs jq)
sh scripts/golden.sh              # regenerate claude-code/tests/support/golden.ts
claude --plugin-dir ./claude-code # load it; edits hot-reload
```

Type-checking needs the engine's types in `claude-code/.claude-plugin/types/`, written when Claude Code loads the mod from `--plugin-dir`.
