---
title: Workflow Scenarios
sidebar_position: 1
---

# Workflow Scenarios

This page is a tutorial walkthrough of the canonical scenarios. The contract source — short, normative, agent-facing — is `documentation/WORKFLOW.md`.

## Scenario A — First time on a project

```mermaid
sequenceDiagram
  participant User
  participant Cmd as Conductor
  User->>Cmd: bash bin/install-opencode-conductor.sh
  User->>Cmd: /project-init my-app
  Cmd->>User: Proposal block (descriptor.json + templates)
  User->>Cmd: approve
  Cmd->>User: descriptor written, AGENTS.md seeded
  User->>Cmd: /scaffold-knowledge my-app dry-run
  Cmd->>User: dry-run preview
  User->>Cmd: /scaffold-knowledge my-app
  Cmd->>User: leaves created
```

What you'll see at the end:

```markdown
## Scaffold result
- created: <n> AGENTS.md
- skipped: 1 (source_missing: legacy/x)
- next_step: customize each leaf as needed
```

## Scenario B — Daily session start

1. Run `/project-refresh <key>`.
2. If you see `missing_branch_context`, run `/project-bootstrap <key>` and rerun refresh.
3. Inspect `## Handoff refresh result` for drift, mode, and next step.

## Scenario C — Big project on a fresh branch

```mermaid
sequenceDiagram
  participant U as User
  participant C as Conductor
  U->>C: /project-branch-new feature/big-thing
  C->>U: per-step git confirms
  U->>C: /project-branch-kickoff my-app
  C->>U: pick model
  U->>C: <selected>
  C->>U: bootstrap or refresh
  C->>U: plan-phases dialog
  U->>C: confirms phases (mermaid prompt accepted)
  C->>U: scaffold-knowledge dry-run + apply
  C->>U: kickoff result block + audit
```

## Scenario D — Tracked-loop iteration

After implementing some changes, run `/project-checkpoint <key>` to record progress in `LOG.md`. When you're ready for review, run `/project-review <key>` and `/project-update-mr <key>`.

## Scenario E — Lite mode (no descriptor, no MR)

For lightweight throwaway work, you can skip descriptor and MR entirely. Use the verification helpers (`/check-types`, `/run-tests`, `/lint-fix`) directly. The kit will not write durable knowledge in this mode.

## Scenario F — Branch exploration

```mermaid
flowchart LR
  Want[Try a feature in browser] --> Stash{Dirty tree?}
  Stash -- yes --> KitStash[Offer kit-stash]
  Stash -- no --> Switch[Switch branch with confirm]
  KitStash --> Switch
  Switch --> Read[Read diff and lockfiles]
  Read --> Guide[Write EXPLORE_GUIDE.md]
  Guide --> User[User runs setup and tries URL]
  User --> Back[Switch back]
  Back --> Reminder[kit-stash reminder]
```

## Scenario G — Help docs generation

1. Decide `<output-root>` outside the repo.
2. Run `/project-help-docs <output-root> --scope=<area>`.
3. Review the audit findings (none expected if vocab is clean).
4. Publish from `<output-root>` to your docs site.

## Scenario H — Cross-branch master drift

Your branch is behind `main`. The kit:

- Surfaces a knowledge-drift finding via the preflight.
- Suggests a single-file pull-up for stale `AGENTS.md` files.
- Does not auto-rebase; you control the merge strategy.

## What a real session looks like

```markdown
> /project-branch-kickoff my-app

## Branch kickoff result
- model: <selected>
- mode: tracked
- phases: 4
- mermaid: yes
- scaffold: applied (3 leaves)
- audit: appended

> /project-checkpoint my-app

## Checkpoint result
- snippet appended to LOG.md

> /project-review my-app

## Preflight summary
- drift: clean
- missing-block: none

## Findings
| id | severity | scope | summary |
| --- | --- | --- | --- |
| F-01 | info | api | unused import |

## Suggested verifications
- bun run typecheck
- bun run test
- pytest api -v
```
