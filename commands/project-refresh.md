---
description: Generic context refresh via descriptor-driven tool
subtask: true
---

Refresh context for the current project.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
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
4. Read every file listed in `reread_files`. The tool resolves project-root rules as `descriptor.projectAgentsPath` → `<projectRootPath>/AGENTS.md` → legacy `<opencodeProjectRootPath>/AGENTS.md`, matching `/manual-refresh`.
5. Preserve helper-state fields from the tool response (`helper_manifest_path`, `manifest_error`, `supported_helpers`, `tracked_helpers`, `existing_helpers`, `missing_helpers`, `untracked_helpers`, `unsupported_helpers`, `available_helpers`, `removed_helpers`, `helper_drift`). Missing helpers are choices or repair items, not fatal branch context errors. An invalid manifest is a repair error and must never be overwritten during refresh.
   - If `helper_drift` is non-empty, add a `next_steps` entry such as `Helper drift detected: run /project-helper <projectKey> to recreate, relink, mark removed, or skip.`
6. Preserve review-state fields from the tool response (`review_present`, `review_state`, `reviewed_head`, `head_has_moved_since_review`, `open_review_findings`) so downstream review commands can decide whether to create, continue, or preserve-update Review notes (`REVIEW.md`).
7. Preserve shared-branch status fields from the tool response (`upstream_ref`, `branch_sync_state`, ahead/behind counts, `remote_ref_may_be_stale`, `active_branch_context`, `alternate_branch_context_detected`, `unlogged_commit_source_hint`, and `reconciliation_recommended`). These are local-ref diagnostics only; this command never fetches, pulls, or writes handoff artifacts.
   - `mr_update_recommended` / the `merge_request` reconciliation entry are **review-driven**: the tool sets them `true` only when `REVIEW.md` exists AND has open findings or is stale vs HEAD. They mean "consider refreshing the local `MERGE_REQUEST.md` `## OpenCode:` machine blocks via `/project-update-mr`" — never push the branch or a remote change request. When recommending it, cite the triggering signal (open finding ids or `review_state`).
   - `narrative_drift_suspected` is an **advisory** that the branch may have grown beyond the MR's human-authored scope (e.g. a PHASES feature not in `## In scope`). When `true`, add a `next_steps` entry suggesting a human review/update the narrative or use `/project-update-mr` option D — never auto-edit the narrative.
8. Preserve deterministic review filtering fields (`review_ignored_path_globs`, `reviewable_changed_files_count`, `reviewable_changed_files_preview`, `ignored_changed_files_count`, and `ignored_changed_files_preview`).
9. Parse changed-area `AGENTS.md` files for `## Verification scripts` tables and match rows against changed files in the refresh window.
   - Dedupe matching `Command` values in first-seen order.
   - If any matched command starts with `/run-playwright-tests`, preserve it as a Playwright-sensitive recommendation.
   - Do not run the command and do not read `.env` files.
   - Add one `next_steps` entry such as `Playwright-sensitive changes detected; consider <command>` for each matched Playwright command.

## Output format (MUST use exactly)

After completing the procedure, output the following block. The receiving agent or user parses this structure directly. Do NOT omit fields, do NOT reorganize into prose.

```
## Handoff refresh result
- refresh_contract_version: 3
- descriptor_schema_version: <1|2|3>
- project_key: <resolved projectKey>
- handoff_mode: <tracked|lite>
- branch: <current branch name>
- checkpoint: <checkpoint_commit> → <head_commit>
- checkpoint_source: <arg|log_field|merge_base|fallback_window|lite_window>
- changed_areas: [<comma-separated area names>]
- changed_files_count: <number>
- review_ignored_path_globs: [<globs>|none]
- reviewable_changed_files_count: <number>
- reviewable_changed_files_preview: [<paths>|none]
- ignored_changed_files_count: <number>
- ignored_changed_files_preview: [<paths>|none]
- helper_manifest_path: <path|none>
- manifest_error: <reason|none>
- supported_helpers: [<ids>|none]
- tracked_helpers: [<ids>|none]
- existing_helpers: [<ids>|none]
- missing_helpers: [<ids>|none]
- untracked_helpers: [<ids>|none]
- unsupported_helpers: [<ids>|none]
- available_helpers: [<ids>|none]
- removed_helpers: [<ids>|none]
- helper_drift: [<helper:status>|none]
- review_present: <true|false>
- review_path: <path|none>
- review_state: <new_review|existing_current|existing_head_moved|existing_unknown_head>
- reviewed_head: <sha|unknown>
- head_has_moved_since_review: <true|false|unknown>
- open_review_findings: [<current or legacy ids>|none]
- upstream_ref: <origin/branch|none|unknown>
- upstream_head: <sha|none|unknown>
- branch_sync_state: <up_to_date|behind|ahead|diverged|no_upstream|unknown>
- commits_ahead_upstream: <N|unknown>
- commits_behind_upstream: <N|unknown>
- last_fetch_age_minutes: <N|unknown>
- branch_sync_stale_after_minutes: <N>
- remote_ref_may_be_stale: <true|false|unknown>
- active_branch_context: <private|shared-git|custom|unknown>
- alternate_branch_context_detected: <private|shared-git|private,shared-git|none|unknown>
- unlogged_commit_source_hint: <none|upstream_reachable|local_unpushed|mixed|unknown>
- reconciliation_recommended: [<log|phases|review|merge_request|none>]
- reread_files:
  - <path 1>
  - <path 2>
  - ...
- log_append_recommended: <true|false>
- mr_update_recommended: <true|false>
- narrative_drift_suspected: <true|false>
- needs_checkpoint: <true|false>
- context_staleness: <fresh|aging|unknown>
- agents_stale_vs_branch: <true|false|unknown>
- risks:
  - <risk 1>
  - <risk 2>
  - ...
- next_steps:
  - <review-state-aware recommendation, e.g. Run /project-review $ARGUMENTS, continue triage in REVIEW.md, or run /project-review $ARGUMENTS in preserve mode>
  - <other recommendations>
  - ...
```

After the structured block, you MAY add a brief narrative summary for human readability, but the structured block MUST come first and MUST be complete.

## Constraints

- Do not mix context across branches.
- Do not update shared `AGENTS.md` automatically; log findings in branch `LOG.md` first.
