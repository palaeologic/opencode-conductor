---
description: Manual fallback refresh without tool-calling
subtask: true
---

CRITICAL: Your output MUST begin with the structured block defined in "Output format" below. No prose before it.

Tool-calling is disabled. Run manual handoff refresh.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Procedure

1. Resolve branch and repo root from git.
2. Load descriptor at `~/.config/opencode/projects/<resolved key>/descriptor.json`.
3. Determine handoff mode from `handoffModeDefault` (default: `tracked`).
4. **Tracked**: if branch context files (`MERGE_REQUEST.md`, `LOG.md`) are missing, seed from `_templates/mr/`. **Lite**: skip — no branch files required.
5. Read context in order: project `AGENTS.md` → active area `AGENTS.md` → package `AGENTS.md` (if applicable) → branch `MERGE_REQUEST.md` → `PHASES.md` (if present) → latest `LOG.md`.
6. Determine checkpoint: `reviewed_through` field from `LOG.md` (tracked), or merge-base / last N commits window (lite).
7. Inspect git delta from checkpoint to `HEAD`: list changed files, bucket by area prefix.
8. Do not mix context across branches.
9. Do not auto-update shared `AGENTS.md`; propose promotions separately.

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

RULES:
- The structured block MUST be the FIRST thing you output. No preamble, no greeting, no summary before it.
- Every field MUST be present. Use `unknown` or `0` when a value cannot be determined.
- After the structured block, you MAY add a brief narrative summary for human readability.
