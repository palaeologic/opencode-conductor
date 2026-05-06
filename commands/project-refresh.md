---
description: Generic context refresh via descriptor-driven tool
subtask: true
---

Refresh context for the current project.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Procedure

1. Call the OpenCode tool `opencode_refresh_context` with:
   - `projectKey: <resolved key>`
   - `refreshMode: fast`
   - `maxCommits: 10`
   - `writeLog: false`
   - optional `handoffMode: lite` when `descriptor.handoffModeDefault` is `lite` or user requested lite
2. Parse the tool response (JSON string).
3. If `applicable` is false, stop and report `reason` + `recommended_next_step`.
4. Read every file listed in `reread_files`.

## Output format (MUST use exactly)

After completing the procedure, output the following block. The receiving agent or user parses this structure directly. Do NOT omit fields, do NOT reorganize into prose.

```
## Handoff refresh result
- project_key: $ARGUMENTS
- handoff_mode: <tracked|lite>
- branch: <current branch name>
- checkpoint: <checkpoint_commit> → <head_commit>
- checkpoint_source: <log_field|merge_base|lite_window>
- changed_areas: [<comma-separated area names>]
- changed_files_count: <number>
- reread_files:
  - <path 1>
  - <path 2>
  - ...
- log_append_recommended: <true|false>
- mr_update_recommended: <true|false>
- needs_checkpoint: <true|false>
- context_staleness: <fresh|aging|stale>
- agents_stale_vs_branch: <true|false|unknown>
- risks:
  - <risk 1>
  - <risk 2>
  - ...
- next_steps:
  - Run /project-review $ARGUMENTS to generate a review artifact
  - <other recommendations>
  - ...
```

After the structured block, you MAY add a brief narrative summary for human readability, but the structured block MUST come first and MUST be complete.

## Constraints

- Do not mix context across branches.
- Do not update shared `AGENTS.md` automatically; log findings in branch `LOG.md` first.
