# Glossary

SkyWatch names session concepts with a starship theme. Code and docs use these words, and only these.

| Term | Means |
| --- | --- |
| bridge | The main agent of the session. |
| shuttle | A subagent the bridge launches. The list of shuttles is the fleet. |
| probe | A model loop no shuttle claims (a workflow agent, a compaction or memory fork). |
| council | Advisor and architect agents or server tools. One consultation is a transmission. |
| jump | One turn of the main agent, from prompt to completion. |
| hull | The context a model request reads (input plus cache read and write tokens). |
| helm | The row with a model's effort, its name and the permission mode. |
| warp | How fast requests answer: time to the first piece, and output tokens per second (burst is the last request, cruise the average). |
| scanning | What the bridge or a shuttle is doing now: its task-list step, or its tool call. |
| debrief | A docked shuttle's final answer. |
| fuel | Tokens in and out, with the cost and the number of requests. |
| power | A rate limit: how much of it is used, and when it recharges. |
| hazard | A step on the context-fill scale, from Clear space to Event horizon. |
| viewscreen | The hazard band above the prompt. |
| beacon | The one-line hazard status entry. |
| shields | Permission checks and their verdicts. |
| sensors | The strip of the latest checks, one mark per verdict. |
| protocols | Checks Claude Code's own rules settled. |
| airlock | Prompts the person answered; autopilot in auto mode, where the classifier answers. |
| deck | A group of tools on the Shields module (`file`, `git`, `shell`, `web`, `agents`, `app`, `mcp`, `other`). |
| force field | The part of Shields that holds or blocks risky commands. |
| directive | A user rule `pass`, `hold` or `block` for a group (`@delete`) or a command. |
| hold | A risky call sent to the permission prompt with a measure of what it would change. |
| measure | A read-only dry run of what a risky command would change. |
| mission | The whole session's totals (tokens, cost, active time, rate limits). |
| black box | The event log shown in the pane, newest first. |
| captain | The person at the prompt; their prompts are black box entries. |
| comms | The writer of black box entries the engine opened a jump with: a slash command, a task notification, a hand-back. |
