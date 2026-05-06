---
description: Draft or refresh durable package/area knowledge from branch context
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Propose** updates to shared knowledge files (not branch diaries).

Workflow:
1. Run `opencode_refresh_context` with `projectKey: $ARGUMENTS`.
2. Read `reread_files` plus any paths from `trackedKnowledgeTargets` in the descriptor that match the current `changed_areas`.
3. Summarize durable findings that belong in shared `AGENTS.md` / package knowledge (not one-off branch noise).
4. Output a **proposal only**: file path, suggested new text or diff summary, rationale, risk.
5. Apply edits to shared knowledge files **only if** the user explicitly approves each file in the same session.

Constraints:
- Default: branch `LOG.md` absorbs exploration; promotion is opt-in.
- Prefer the model configured under `descriptor.subtaskModels.knowledge` when registering this command in `opencode.json` (see README).
