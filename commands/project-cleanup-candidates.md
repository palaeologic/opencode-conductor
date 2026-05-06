---
description: List stale branch handoff folders for review (read-only)
subtask: true
---

For project key `$ARGUMENTS`, produce a **read-only** report of branch handoff folders that may be stale.

Workflow:
1. Read `~/.config/opencode/projects/$ARGUMENTS/descriptor.json` and resolve `branchHandoff.contextDirTemplate` parent: typically `~/.config/opencode/projects/$ARGUMENTS/branches/`.
2. List immediate child directories (one per branch name).
3. For each child, stat `LOG.md` and `MERGE_REQUEST.md` (or files in `mrFilenames` if present) mtime and optional last log heading.
4. Flag candidates when:
   - no activity for 30+ days **or**
   - branch name no longer exists in `git branch --list` from the linked repo (optional check if cwd is the project repo).
5. Return a markdown table: branch folder, last activity hint, suggested action (`archive`, `review`, `no-op`). **Do not delete anything** without explicit user confirmation in chat.

Constraints:
- This command is advisory only.
- Never print secrets from `opencode.json` or descriptors.
