---
description: Session close summary in branch LOG.md (tracked mode)
subtask: true
---

Tracked handoff: append a **session close** block to branch `LOG.md` for project key `$ARGUMENTS`.

Workflow:
1. Call `opencode_refresh_context` with `projectKey: $ARGUMENTS`.
2. If not applicable, follow the same bootstrap path as `/project-checkpoint`.
3. If the session produced **no meaningful code or doc changes** since the last `LOG.md` entry, skip the append unless the user explicitly asked to close anyway.
4. Otherwise append under a new `## YYYY-MM-DD HH:MM` heading (or a dedicated `### Session close` subsection):
   - One-line summary of what was accomplished
   - **Next:** the single most important follow-up for the next session
   - `reviewed_through: <head_commit>` when appropriate
5. Return the path updated.

Constraints:
- Append-only `LOG.md`.
- Never remove merged branch folders or promote shared knowledge from this command alone.
