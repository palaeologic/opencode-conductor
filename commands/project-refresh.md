---
description: Generic context refresh via descriptor-driven tool
subtask: true
---

Refresh context for the current project.

## Project key resolution

If `$ARGUMENTS` is provided, use the first token as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use `<resolved projectKey>` in tool calls and in the output block below** (not the raw `$ARGUMENTS` string).

## Procedure

1. Call the OpenCode tool `opencode_refresh_context` with:
   - `projectKey: <resolved projectKey>`
   - `refreshMode: fast`
   - `maxCommits: 10`
   - `writeLog: false`
   - optional `handoffMode: lite` when `descriptor.handoffModeDefault` is `lite` or user requested lite
2. Parse the tool response (JSON string).
3. If `applicable` is false`:
   - Always report `reason` and `recommended_next_step` from the tool.
   - If `reason` is **`missing_branch_context`**, still emit the full **`## Handoff refresh result`** block below with: `missing_branch_context: true`; `branch` from `git rev-parse --abbrev-ref HEAD`; `checkpoint` / `changed_*` may be unknown or empty; map the tool’s **`branch_context_readable`** object (when present) into **`branch_context_status`** sub-bullets; set **`next_steps`** first bullet to the bootstrap-then-refresh line from the Output format section.
   - Otherwise (`workspace_not_in_project`, `detached_head`, etc.), emit a minimal handoff block or plain error per team preference; do not fake success fields.
4. If `applicable` is true, read every file listed in `reread_files`.

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

**`missing_branch_context`:** set to **`true`** when the tool returned `applicable: false` and `reason` is **`missing_branch_context`** (tracked mode but branch `MERGE_REQUEST.md` / `LOG.md` context is missing or unreadable). Otherwise **`false`**.

**`next_steps` when `missing_branch_context` is true:** the **first** `next_steps` bullet MUST be:

`Run /project-bootstrap <projectKey> to create branch context files (MERGE_REQUEST.md, LOG.md, optional PHASES.md), then re-run /project-refresh <projectKey>.`

(use the literal command names `/project-bootstrap` and `/project-refresh` with the resolved `<projectKey>`).

**Staleness hint (optional):** If refresh succeeded and you can compare `git rev-parse HEAD` to the `reviewed_through` value in branch `LOG.md` (or the commit range in `MERGE_REQUEST.md` `## OpenCode:` review status) and they differ, add as the **first or second** `next_steps` bullet when helpful: `Branch HEAD moved since last LOG checkpoint or MR sync — consider /project-update-mr <projectKey> option A to refresh machine blocks, or confirm skip if intentional.` Do not treat file mtimes alone as proof of staleness.

After the structured block, you MAY add a brief narrative summary for human readability, but the structured block MUST come first and MUST be complete.

## Session de-duplication (token saving)

If this session **already** produced a `## Handoff refresh result` block for the **same** `project_key` and **`git rev-parse HEAD` is unchanged**, the agent should **reuse** that block and **not** re-run full `git log` / large `git diff` unless the user asked to re-scan.

## Constraints

- Do not mix context across branches.
- Do not update package **`KNOWLEDGE.md`** (or legacy package `AGENTS.md`) automatically; log findings in branch `LOG.md` first.
