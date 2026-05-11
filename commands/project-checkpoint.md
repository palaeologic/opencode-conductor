---
description: Append a checkpoint entry to branch LOG.md (tracked mode)
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use the resolved `<projectKey>` in tool calls, `/project-bootstrap` hints, manual fallback paths, and summaries** — not the raw `$ARGUMENTS` string when it contained extra flags.

Tracked handoff: append a **checkpoint** to the branch `LOG.md`.

Workflow:
1. Call `opencode_refresh_context` with `projectKey: <projectKey>` (optional `handoffMode: tracked` if the descriptor defaults to lite).
2. If `applicable` is false and reason is `missing_branch_context`, run `/project-bootstrap <projectKey>` first, then refresh again.
3. Open `log_context_path` from the refresh result.
4. Append a new `## YYYY-MM-DD HH:MM` section with:
   - `reviewed_through: <head_commit>` (or update the line in the new section per your team convention)
   - Short bullet list: what changed since last checkpoint, key files, open risks
5. Return confirmation with the path written and the SHA recorded.

Manual fallback (when tools are unavailable):
1. Load `~/.config/opencode/projects/<projectKey>/descriptor.json`, expand `branchHandoff.contextDirTemplate` with current branch name (default global example: `~/.config/opencode/projects/<projectKey>/branches/<branch>/`).
2. Determine HEAD sha via `git rev-parse HEAD`.
3. Open `LOG.md` directly and append a checkpoint section with `reviewed_through: <sha>`, summary bullets, and timestamp.

Constraints:
- Keep `LOG.md` append-only; do not rewrite historical sections.
- Do not auto-edit project **rules** `AGENTS.md` or package **`KNOWLEDGE.md`** (or legacy shared leaf `AGENTS.md`) from this command.
