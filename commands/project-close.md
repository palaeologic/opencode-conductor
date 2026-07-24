---
description: Session close summary in Progress log when available
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

Tracked handoff: append a **session close** block to Progress log (`LOG.md`) when that helper exists.

Workflow:
1. Call `opencode_refresh_context` with `projectKey: $ARGUMENTS`.
2. If Progress log (`LOG.md`) is missing, explain that it records session-close summaries for future continuity. Ask the user to create it with `/project-helper` or skip close logging for this run.
3. If the session produced **no meaningful code or doc changes** since the last `LOG.md` entry, skip the append unless the user explicitly asked to close anyway.
4. Otherwise append under a new `## YYYY-MM-DD HH:MM` heading (or a dedicated `### Session close` subsection):
   - One-line summary of what was accomplished
   - **Next:** the single most important follow-up for the next session
   - `reviewed_through: <head_commit>` when appropriate
   - Branch lineage fields when they were not already recorded in the immediately preceding checkpoint:
     - `integration_base: origin/<base> (<merge-base-short>)`
     - `parent_branch: <remote/branch or none/unknown>`
     - `branch_delta: <N> commits from integration base`
     - `working_delta: <N> commits from parent/checkpoint to HEAD`
     - `reviewed_window: <start-short>..<head-short>`
   - If the branch is stacked, clarify which commits belong to this session vs inherited parent-branch history.
5. Return the path updated.

Manual fallback (when tools are unavailable):
1. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`), load `<config-root>/projects/<resolved projectKey>/descriptor.json`, and expand `branchHandoff.contextDirTemplate` with the current branch name.
2. Determine HEAD sha via `git rev-parse HEAD`.
3. Determine the integration merge-base and commit counts when possible.
4. Locate Progress log (`LOG.md`) from `HELPERS.json` or the descriptor helper registry, then append a session-close section: summary, next step, lineage fields, and `reviewed_through: <sha>`.

Constraints:
- Append-only Progress log (`LOG.md`) when it exists.
- Never remove merged branch folders or promote shared knowledge from this command alone.
