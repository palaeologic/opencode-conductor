---
description: Session close summary in branch LOG.md (tracked mode)
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use the resolved `<projectKey>` in tool calls, bootstrap hints, manual fallback paths, and summaries** — not the raw `$ARGUMENTS` when it contained extra flags.

Tracked handoff: append a **session close** block to branch `LOG.md`.

Workflow:
1. Call `opencode_refresh_context` with `projectKey: <projectKey>`.
2. If not applicable, follow the same bootstrap path as `/project-checkpoint`.
3. If the session produced **no meaningful code or doc changes** since the last `LOG.md` entry, skip the append unless the user explicitly asked to close anyway.
4. Otherwise append under a new `## YYYY-MM-DD HH:MM` heading (or a dedicated `### Session close` subsection):
   - One-line summary of what was accomplished
   - **Next:** the single most important follow-up for the next session
   - `reviewed_through: <head_commit>` when appropriate
5. Return the path updated.

Manual fallback (when tools are unavailable):
1. Load `~/.config/opencode/projects/<projectKey>/descriptor.json`, expand `branchHandoff.contextDirTemplate` with current branch name (default global example: `~/.config/opencode/projects/<projectKey>/branches/<branch>/`).
2. Determine HEAD sha via `git rev-parse HEAD`.
3. Open `LOG.md` directly and append a session-close section: summary, next step, and `reviewed_through: <sha>`.

Constraints:
- Append-only `LOG.md`.
- Never remove merged branch folders or promote shared knowledge from this command alone.
