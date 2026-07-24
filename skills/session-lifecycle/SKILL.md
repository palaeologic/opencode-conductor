---
name: session-lifecycle
description: Guide a complete coding session from context load through work to checkpoint and close
---

## What I do

Provide structure for a full coding session using the handoff kit's lifecycle commands. Ensures context is loaded at the start, progress is checkpointed during work, and the session is properly closed for future continuity.

## When to use me

- Starting a new coding session on an existing branch
- You want to ensure proper handoff discipline throughout a session
- You're unsure when to checkpoint or close
- Working in tracked mode and want to maintain LOG.md properly

## Workflow

### Phase 1: Session start

1. Run `/manual-refresh` to load context. Use `/project-refresh` only in environments where the Bun tools are explicitly enabled and working.
2. Review the refresh output:
   - Check `handoff_mode` — if tracked, branch helper files are optional and listed under `existing_helpers`
   - If `helper_drift` is non-empty, run `/project-helper` to recreate, relink, mark removed, or skip affected helpers
   - Check `agents_stale_vs_branch` — re-read area `AGENTS.md` and relevant leaf `KNOWLEDGE.md` if true
3. Review `next_steps` from refresh output for recommendations

### Phase 2: Active work

During the session, follow these checkpointing rules:

**Checkpoint when:**
- You've completed a logical unit of work (feature, fix, refactor)
- Before switching to a different area or concern
- Before taking a break or context switch
- After resolving a tricky bug (capture the reasoning)

**How to checkpoint:**
- Run `/project-checkpoint` — appends to LOG.md with timestamp and summary, then reconciles completed active-phase checkpoints in `PHASES.md` when that file exists

**Keep LOG.md useful:**
- Record what was done, what was discovered, and what remains
- Include verification status (tests passing? types clean?)
- Note any decisions made and their rationale
- Clarify branch lineage and the actual reviewed commit window:
  - `integration_base`: resolved base branch and merge-base
  - `parent_branch`: stacked branch or `none` / `unknown`
  - `branch_delta`: total commits from integration base to `HEAD`
  - `working_delta`: commits from parent/checkpoint to `HEAD`
  - `reviewed_window`: the narrow range summarized by this checkpoint
- On stacked branches, do not summarize inherited parent-branch commits as if they were new session work

### Phase 3: Session close

When finishing work:

1. Run `/project-checkpoint` for any un-logged progress
2. Run `/project-close` — generates a session summary
3. If you have durable knowledge to promote, note it for `/project-knowledge-refresh` next session

### Tips

- In **lite mode**: checkpoints are optional but `/project-close` still helps the next session
- If interrupted unexpectedly: the next session's `/manual-refresh` will pick up from the last checkpoint
- Don't over-checkpoint — one per logical unit is enough
