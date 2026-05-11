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

1. Run `/manual-refresh` or `/project-refresh` to load context
2. Review the refresh output:
   - Check `handoff_mode` — if tracked, branch files should exist
   - If `missing_branch_context` is **`true`**, run **`/project-bootstrap`** then **`/project-refresh`** or **`/manual-refresh`** again
   - Read **`branch_context_status`** when present — partial trees (e.g. `PHASES.md` without readable MR/LOG) still need bootstrap to seed missing pieces
   - Check `agents_stale_vs_branch` — re-read project **rules `AGENTS.md`** and active area **`KNOWLEDGE.md`** (or legacy area `AGENTS.md`) if true
3. Review `next_steps` from refresh output for recommendations
4. **Token discipline:** keep the latest **`## Handoff refresh result`** block in the session; until **`git rev-parse HEAD`** changes, **do not** re-run full `git log` / wide `git diff` for every follow-on command — cite the handoff block or confirm HEAD with a single shell check

### Phase 2: Active work

During the session, follow these checkpointing rules:

**Checkpoint when:**
- You've completed a logical unit of work (feature, fix, refactor)
- Before switching to a different area or concern
- Before taking a break or context switch
- After resolving a tricky bug (capture the reasoning)

**How to checkpoint:**
- Run `/project-checkpoint` — appends to LOG.md with timestamp and summary

**Keep LOG.md useful:**
- Record what was done, what was discovered, and what remains
- Include verification status (tests passing? types clean?)
- Note any decisions made and their rationale

### Phase 3: Session close

When finishing work:

1. Run `/project-checkpoint` for any un-logged progress
2. Run `/project-close` — generates a session summary
3. If you have durable knowledge to promote, note it for `/project-knowledge-refresh` next session

### Tips

- In **lite mode**: checkpoints are optional but `/project-close` still helps the next session
- If interrupted unexpectedly: the next session's `/manual-refresh` will pick up from the last checkpoint
- Don't over-checkpoint — one per logical unit is enough
