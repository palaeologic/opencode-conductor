---
description: Manual fallback refresh without tool-calling
subtask: true
---

CRITICAL: Your output MUST begin with the structured block defined in "Output format" below. No prose before it.

Tool-calling is disabled. Run manual handoff refresh.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Procedure

1. Resolve branch and repo root from git.
2. Load descriptor at `<config-root>/projects/<resolved key>/descriptor.json` (kit contract — see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)).
3. Determine handoff mode from `handoffModeDefault` (default: `tracked`).
4. Resolve the branch helper registry from `branchHandoff.helpers` and the branch manifest (`HELPERS.json` unless `helperManifestFilename` overrides it). For schema v1/v2, normalize the fixed MR/log/phases/review filename fields into equivalent helper definitions. Do **not** seed branch helper files during refresh.
5. Reconcile descriptor + manifest + filesystem:
   - `supported_helpers`: helper ids declared in the descriptor.
   - `tracked_helpers`: helper ids listed in the branch manifest and not marked removed.
     For schema v1/v2 branches without a manifest, treat supported helper files already present on disk as implicitly tracked.
   - `existing_helpers`: helper ids whose files exist now.
   - `missing_helpers`: tracked helpers whose files are gone.
   - `untracked_helpers`: supported helper files found on disk but not tracked in the manifest.
   - `unsupported_helpers`: manifest entries or common helper files no longer supported by the descriptor.
   - `available_helpers`: supported helpers this branch has not opted into.
   - `removed_helpers`: helpers deliberately marked removed in the branch manifest.
   - `helper_drift`: missing, untracked, or unsupported helper states that should be repaired with `/project-helper`.
   - `manifest_error`: parse/schema error for the helper manifest, otherwise `none`; never overwrite an invalid manifest during refresh.
6. Read context in order: **`projectAgentsPath`** (fallback to `opencodeProjectRootPath/AGENTS.md` if the field is absent) → active area’s **`areaAgentsPath`** → leaf `KNOWLEDGE.md` (if applicable; legacy package `AGENTS.md` only as fallback) → every existing helper file from `HELPERS.json` / descriptor helpers, prioritizing Merge request context (`MERGE_REQUEST.md`), Phase plan (`PHASES.md`), Progress log (`LOG.md`), then Review notes (`REVIEW.md`).
7. Determine checkpoint: `reviewed_through` field from Progress log (`LOG.md`) when present, otherwise merge-base / last N commits.
8. Inspect Review notes (`REVIEW.md`) state if the file exists:
   - Parse optional `<!-- OpenCode: review metadata ... -->`.
   - Extract `reviewed_head`, `reviewed_window`, and open `F/R/M###` or legacy `F-xx` ids from `### Triage checklist (by Id)`.
   - Set `review_state` to `new_review`, `existing_current`, `existing_head_moved`, or `existing_unknown_head`.
   - Set `head_has_moved_since_review` by comparing metadata `reviewed_head` with current `HEAD`; use `unknown` when metadata is absent.
9. Inspect local upstream status without fetching or pulling:
   - Resolve `upstream_ref` with `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`; use `none` when unavailable.
   - If upstream exists, compute `branch_sync_state` from `git rev-list --left-right --count HEAD...@{upstream}`:
     - `up_to_date` when ahead=0 and behind=0.
     - `behind` when ahead=0 and behind>0.
     - `ahead` when ahead>0 and behind=0.
     - `diverged` when ahead>0 and behind>0.
     - `unknown` on parse failure.
   - Check `FETCH_HEAD` mtime when available; set `remote_ref_may_be_stale: true` when the last fetch is older than `descriptor.branchSyncStaleAfterMinutes` (default 60), `false` when fresher, `unknown` when unavailable.
   - Do not run `git fetch` or `git pull` from this command.
10. Inspect git delta from checkpoint to `HEAD`: list changed files, bucket by area prefix, then apply `reviewIgnoredPathGlobs` to form disjoint `reviewable` and `ignored` partitions. Use the same git-style matching semantics as `/project-review`; keep bounded previews for both partitions. Classify `unlogged_commit_source_hint`:
   - `none` when checkpoint..HEAD has no commits.
   - `upstream_reachable` when all checkpoint..HEAD commits are reachable from upstream.
   - `local_unpushed` when no checkpoint..HEAD commits are reachable from upstream.
   - `mixed` when both conditions appear.
   - `unknown` when upstream or commit reachability cannot be resolved.
11. Determine `active_branch_context` from the descriptor-resolved branch folder:
   - `private` for `<config-root>/projects/<key>/branches/<branch>/`.
   - `shared-git` for `<projectRootPath>/.opencode-conductor/branches/<branch>/`.
   - `custom` for any other descriptor path.
   Check the inactive private/shared-git root for `HELPERS.json` or descriptor helper filenames; set `alternate_branch_context_detected` to `private`, `shared-git`, comma-separated values, or `none`. Never merge private and shared context automatically.
12. Populate `reconciliation_recommended`:
   - include `log` only when Progress log (`LOG.md`) exists and changed files exist since checkpoint.
   - include `phases` when Phase plan (`PHASES.md`) exists and changed files exist.
   - include `review` when `review_state` is `existing_head_moved` or `existing_unknown_head`.
   - include `merge_request` **only when Merge request context (`MERGE_REQUEST.md`) exists and there is reviewable state to mirror**, i.e. Review notes (`REVIEW.md`) exist AND (`open_review_findings` is non-empty OR `review_state` is `existing_head_moved` or `existing_unknown_head`). This matches the `/project-refresh` tool's `mrUpdateRecommendedFromReview(...)` gate exactly. Do **not** include it merely because files changed. If no Review notes exist or they have nothing open/stale, omit `merge_request`.
   - Note: `merge_request` here means "consider refreshing the **local Merge request context (`MERGE_REQUEST.md`) `## OpenCode:` machine blocks** via `/project-update-mr`" — it does **not** mean push the branch or open/update a remote change request.
   - otherwise use `none`.
12b. Detect **narrative drift** for the advisory `narrative_drift_suspected` field (mirrors the tool's `narrativeDriftSuspected(...)`). This is a separate, human-facing concern from `merge_request` and must NOT flip the machine-block trigger. Set `true` only when both Phase plan and Merge request context exist, changed files exist since checkpoint, and the branch has advanced beyond the checkpoint range recorded in the MR `## OpenCode: review status` block (i.e. the block head is behind current `HEAD`). Since you have read the MR narrative in step 6, you MAY also set it `true` when `PHASES.md`/`LOG.md` clearly describe scope absent from the MR `## In scope` / `## Goal`. When you cannot determine drift confidently, set `false` (bias to no false alarms). Never auto-edit the narrative.
13. Parse changed-area `AGENTS.md` files for `## Verification scripts` tables and match rows against changed files in the refresh window.
   - Dedupe matching `Command` values in first-seen order.
   - If any matched command starts with `/run-playwright-tests`, add a `next_steps` entry such as `Playwright-sensitive changes detected; consider <command>`.
   - Do not run the command and do not read `.env` files.
14. Do not mix context across branches.
15. Do not auto-update shared `AGENTS.md`; propose promotions separately.

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
- open_review_findings: [<F/R/M or legacy F-xx ids>|none]
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

RULES:
- The structured block MUST be the FIRST thing you output. No preamble, no greeting, no summary before it.
- Every field MUST be present. Use `unknown` or `0` when a value cannot be determined.
- `mr_update_recommended` MUST be `true` only under the same review-driven gate as step 12's `merge_request`: Merge request context (`MERGE_REQUEST.md`) exists, `review_present` is `true`, and (`open_review_findings` non-empty OR `review_state` is `existing_head_moved`/`existing_unknown_head`); otherwise `false`. Do not set it `true` merely because files changed. It refers to refreshing the local `MERGE_REQUEST.md` `## OpenCode:` blocks via `/project-update-mr`, not pushing the branch or updating a remote change request.
- If `helper_drift` is non-empty, add a `next_steps` entry that uses plain language, e.g. `Helper drift detected: run /project-helper $ARGUMENTS to recreate, relink, mark removed, or skip missing helper files.`
- Always justify an MR recommendation: whenever `mr_update_recommended` is `true` (or you surface `merge_request`), state the specific triggering signal in a `next_steps` entry — e.g. `MR machine-block refresh suggested: open findings F001, F003 in REVIEW.md` or `... : review stale vs HEAD (review_state=existing_head_moved)`. Never emit a bare "update the MR?" prompt.
- When `narrative_drift_suspected` is `true`, add a `next_steps` advisory that names what drifted, e.g. `Possible MR scope drift: PHASES.md/commits include work not reflected in MERGE_REQUEST.md ## In scope. Review/update the narrative manually or via /project-update-mr option D (human decision; never auto-applied).`
- After the structured block, you MAY add a brief narrative summary for human readability.
