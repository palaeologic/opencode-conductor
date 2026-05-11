---
description: Manual fallback refresh without tool-calling (parity with /project-refresh)
subtask: true
---

CRITICAL: Your output MUST begin with the structured block defined in "Output format" below. No prose before it.

Tool-calling is disabled. Run manual handoff refresh — **same contract** as [`project-refresh.md`](./project-refresh.md) so agents can treat **`## Handoff refresh result`** identically whether tools or Bedrock are available.

## Project key resolution

If `$ARGUMENTS` is provided, use the first token as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use `<resolved projectKey>` in the output block** (not the raw `$ARGUMENTS` string).

## Procedure

1. Resolve branch and repo root from git.
2. Load descriptor at `~/.config/opencode/projects/<resolved projectKey>/descriptor.json` (kit contract — see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)).
3. Expand `branchHandoff.contextDirTemplate` for the current branch.
4. **Tracked mode** (default from `handoffModeDefault`):
   - Try to read primary `MERGE_REQUEST.md` and `LOG.md` from the branch folder.
   - Set `missing_branch_context` to **`true`** when **either** file is missing or unreadable; set **`branch_context_status`** booleans accordingly.
   - If missing, **seed** from `branchHandoff.templatesDir` templates (same behavior as bootstrap for first-time setup) so the next read can succeed when appropriate.
   - When `missing_branch_context` is true, **list in prose** (after the structured block) which files were found vs missing (`PHASES.md` may exist alone — still not sufficient for tracked refresh until MR **and** LOG are readable).
5. **Lite mode:** skip branch file requirement; set `missing_branch_context: false`.
6. Read context in order: **`opencodeProjectRootPath`/AGENTS.md** (rules) → optional **`opencodeProjectRootPath`/KNOWLEDGE.md`** when present → active area’s **`areaKnowledgePath`** or sibling **`KNOWLEDGE.md`** beside `areaAgentsPath` or **`areaAgentsPath`** → branch **`MERGE_REQUEST.md`** → **`PHASES.md`** (if present) → latest **`LOG.md`**.
7. Determine checkpoint: `reviewed_through` field from `LOG.md` (tracked), or merge-base / last N commits window (lite).
8. Inspect git delta from checkpoint to `HEAD`: list changed files, bucket by area prefix.
9. Do not mix context across branches.
10. Do not auto-update package **`KNOWLEDGE.md`** or rules **`AGENTS.md`**; propose promotions separately.

## Session de-duplication (token saving)

If this session **already** has a **`## Handoff refresh result`** for the same **`project_key`** and **`HEAD` unchanged**, **reuse** it and avoid repeating expensive `git diff` / `git log` unless the user asks to re-scan.

## Output format (MUST use exactly)

After completing the procedure, output the following block. The receiving agent or user parses this structure directly. Do NOT omit fields, do NOT reorganize into prose.

```
## Handoff refresh result
- project_key: <resolved projectKey>
- handoff_mode: <tracked|lite>
- missing_branch_context: <true|false>
- branch_context_status:
  - merge_request_readable: <true|false>
  - log_readable: <true|false>
  - phases_file_present: <true|false>
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
  - <ordered recommendations>
  - ...
```

RULES:
- The structured block MUST be the FIRST thing you output. No preamble, no greeting, no summary before it.
- Every field MUST be present. Use `unknown` or `0` when a value cannot be determined.
- **`missing_branch_context`:** `true` only in **tracked** mode when MR or LOG cannot be read after optional seeding.
- **`next_steps` when `missing_branch_context` is true:** the **first** bullet MUST be: `Run /project-bootstrap <projectKey> to create branch context files (MERGE_REQUEST.md, LOG.md, optional PHASES.md), then re-run /project-refresh <projectKey> or /manual-refresh <projectKey>.`
- **Staleness (optional):** if `HEAD` differs from `reviewed_through` in `LOG.md` (or MR `## OpenCode:` range is stale), add a `next_steps` bullet suggesting `/project-update-mr <projectKey>` option **A**; do not trust file mtimes alone.
- After the structured block, you MAY add a brief narrative summary for human readability.
