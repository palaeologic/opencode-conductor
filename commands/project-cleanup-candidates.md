---
description: List stale branch handoff folders for review (read-only)
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

Produce a **read-only** report of branch handoff folders that may be stale.

Workflow:
1. Read `<config-root>/projects/<projectKey>/descriptor.json`. Resolve the branch-context root from `branchHandoff.contextDirTemplate`. If `{branchName}` is not the final path component, report that automatic discovery is unsupported for this custom layout and stop without writes.
2. Discover branch directories recursively so branch names containing `/` are included. A directory is a branch context when it contains the configured helper manifest or a filename from the schema v3 helper registry. For schema v1/v2, normalize the fixed helper fields through the compatibility mapping.
3. For each branch directory, read a valid helper manifest when present and stat existing tracked helpers. Prefer the latest activity across roles `log`, `merge_request`, `phases`, and `review`. A malformed manifest is reported and preserved; it is never treated as permission to infer or delete files.
4. Flag candidates when:
   - no activity for 30+ days **or**
   - branch name no longer exists in `git branch --list` from the linked repo (optional check if cwd is the project repo).
5. Return a markdown table: branch name, branch folder, manifest state, last activity hint, and suggested action (`archive`, `review`, `no-op`). **Do not delete anything** without explicit user confirmation in chat.

Constraints:
- This command is advisory only.
- Never print secrets from `opencode.json` or descriptors.
