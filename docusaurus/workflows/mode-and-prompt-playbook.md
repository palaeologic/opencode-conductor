---
title: Mode and Prompt Playbook
sidebar_position: 2
---

# Mode and Prompt Playbook

One-page guide for using **Plan mode** and **Build mode** effectively, and for combining plain prompts with slash commands and skills.

## Quick decision table

| Situation | Recommended mode | Why |
| --- | --- | --- |
| Requirements unclear, multiple approaches, architecture trade-offs | Plan | Explore options before writing code |
| Requirements clear, implementation straightforward | Build | Execute quickly with minimal overhead |
| Big refactor or migration with risk | Plan -> Build | De-risk first, then implement |
| Bug with unknown root cause | Plan -> Build | Isolate and verify before edits |
| Bug with known root cause and small patch | Build | Direct fix is fastest |

## Recommended command alignment

- **Plan-first commands**: `/project-branch-kickoff`, `/project-phases`, `/project-review`, `/project-help-docs`
- **Build-followup work**: concrete code edits, tests, and verification loops
- **Any time**: `/project-state` for read-only context health

Commands and skills should **suggest** switching mode, never force it.

## Combine prompts + commands + skills

```mermaid
flowchart LR
  Intent[1) State intent in one sentence] --> Cmd[2) Run owning command]
  Cmd --> Skill[3) Skills load on demand]
  Skill --> Out[4) Structured output]
  Out --> Refine{Need refinement?}
  Refine -- yes --> Prompt2[Add tighter constraints]
  Prompt2 --> Cmd
  Refine -- no --> Done[Proceed]
```

Use this 3-step pattern:

1. Give one short sentence with constraints.
2. Run the command that owns the workflow.
3. Refine with a second prompt only if needed.

Examples:

- "Prioritize migration safety and low blast radius." + `/project-branch-kickoff my-app`
- "Review for correctness and security; avoid noisy style findings." + `/project-review my-app`
- "Generate docs for support teams; avoid internal jargon." + `/project-help-docs ~/tmp/help --scope=frontend`

## Demo-friendly dry run

Use `mode-hint-only` with supporting commands for a no-write demo:

- `/project-branch-kickoff my-app mode-hint-only`
- `/project-phases my-app mode-hint-only`
- `/project-review my-app mode-hint-only`

Expected structured block:

```markdown
## Mode hint
- recommended_mode_next: <plan|build>
- why: <short rationale>
- explicit_switch: required
```

## Do and don't

- **Do** keep switching explicit and user-confirmed.
- **Do** use Plan mode when choices still matter.
- **Do** switch to Build once acceptance criteria are stable.
- **Don't** auto-switch modes without confirmation.
- **Don't** overload prompts when a command already encodes the workflow.
