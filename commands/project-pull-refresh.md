---
description: Fetch/pull shared branch safely, then refresh handoff context
subtask: false
---

Network-aware shared-branch sync flow. Use this when coworkers may have pushed to the current branch and the user wants to update local refs before deciding whether `LOG.md`, `PHASES.md`, `REVIEW.md`, or `MERGE_REQUEST.md` need reconciliation.

This command may run `git fetch` and `git pull --ff-only` only after explicit confirmation. It must not write branch handoff artifacts directly.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Read-only anchors

Use fixed shell checks before any network or branch mutation:

```
!`git status --porcelain`
!`git symbolic-ref --quiet HEAD || echo DETACHED`
!`git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null || echo none`
!`git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo unknown unknown`
```

Never interpolate `$ARGUMENTS` into shell-injection blocks.

## Workflow

1. Resolve project key and current branch. Stop if detached.
2. Check working tree status:
   - If dirty, stop before fetch/pull and tell the user to commit, stash, or discard changes intentionally.
   - Do not create a stash from this command.
3. Resolve upstream:
   - If no upstream, stop with `sync_state: no_upstream` and recommend setting an upstream or using normal `/manual-refresh <projectKey>`.
4. Compute local ahead/behind using `git rev-list --left-right --count HEAD...@{upstream}` and report the pre-fetch state.
5. Ask before running `git fetch --prune`.
   - If declined, stop after reporting that remote status may be stale.
   - If fetch fails due to auth/network, report the failure and do not pull.
6. Recompute ahead/behind after fetch.
7. If state is:
   - `up_to_date`: do not pull; continue to refresh.
   - `behind`: ask before running `git pull --ff-only`.
   - `ahead`: do not pull; continue to refresh and note local commits are not on upstream.
   - `diverged`: stop and recommend manual rebase/merge; do not pull.
   - `unknown`: stop and recommend `/project-state` plus manual git inspection.
8. After a no-op or successful fast-forward pull, run the `/manual-refresh <projectKey>` procedure in the same turn and preserve all shared-branch fields from its structured block.
9. Translate refresh recommendations into explicit next steps:
   - `log` -> `/project-checkpoint <projectKey>` to append `LOG.md`.
   - `phases` -> `/project-checkpoint <projectKey>` may propose active-phase reconciliation.
   - `review` -> `/project-review <projectKey>` preserve mode, or `/project-review-sync <projectKey>` for lightweight sync.
   - `merge_request` -> `/project-update-mr <projectKey>`.

## Output format

```
## Project pull refresh result
- project_key: <projectKey>
- branch: <current branch name>
- upstream_ref: <origin/branch|none|unknown>
- pre_fetch_sync_state: <up_to_date|behind|ahead|diverged|no_upstream|unknown>
- post_fetch_sync_state: <up_to_date|behind|ahead|diverged|no_upstream|unknown|skipped>
- pull_result: <not_needed|fast_forwarded|declined|blocked_dirty|blocked_diverged|blocked_no_upstream|failed|skipped>
- refresh_ran: <true|false>
- reconciliation_recommended: [<log|phases|review|merge_request|none>]
- next_steps:
  - <step 1>
  - <step 2>
```

After the structured block, include the complete `## Handoff refresh result` block when `refresh_ran: true`.

## Constraints

- Do not use non-fast-forward pull.
- Do not rebase, merge, checkout, stash, or reset.
- Do not edit `LOG.md`, `PHASES.md`, `REVIEW.md`, `MERGE_REQUEST.md`, or source files.
- Keep `/manual-refresh` and `/project-refresh` read-only; this command is the explicit network-aware lane.
