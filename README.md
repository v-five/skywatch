# SkyWatch

**A starbase for your coding agent's session.** A pane beside the transcript runs the session from orbit: the bridge's readings, shields on every permission check, a card for each shuttle (subagent) you launch, the mission's running totals and a black box that records it all. Above the prompt, a hazard scale tells you how full the context is, from Clear space to the Event horizon. Every number comes from a real session event, and nothing leaves your machine.

## Ports

| Tool | Folder | Status |
| --- | --- | --- |
| Claude Code | [`claude-code/`](claude-code/) | ready |

Each port lives in its own folder, with its own README and install steps.

## Claude Code

```sh
claude plugin marketplace add v-five/skywatch
claude plugin install skywatch@v-five
```

See [`claude-code/README.md`](claude-code/README.md) for the modules, the hazard scale, directives, commands and settings.

## Thanks

Inspired by [Flightdeck](https://github.com/scasella/claude-flightdeck) by Stephen Casella.

## License

[Apache-2.0](LICENSE). Attributions are in [NOTICE](NOTICE).
