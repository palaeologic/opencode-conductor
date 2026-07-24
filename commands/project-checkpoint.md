---
description: Append a checkpoint entry to branch LOG.md and reconcile PHASES.md progress
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

Tracked handoff: append a **checkpoint** to Progress log (`LOG.md`) when that helper exists, and reconcile completed phase checkpoints in Phase plan (`PHASES.md`) when that helper exists.

Workflow:
1. Call `opencode_refresh_context` with `projectKey: $ARGUMENTS` (optional `handoffMode: tracked` if the descriptor defaults to lite).
2. If `log_readable` is false, explain: "Progress log (`LOG.md`) records checkpoints so future sessions can resume. Create it now with `/project-helper`, or skip checkpointing for this run." Stop unless the user creates the helper.
3. Open `log_context_path` from the refresh result. If Phase plan (`PHASES.md`) exists, open `phases_context_path` too.
4. Draft the new `## YYYY-MM-DD HH:MM` checkpoint summary for `LOG.md`, but do not append it until the phase-progress result is known.
5. Classify the checkpoint commit source before writing:
   - Prefer the refresh field `unlogged_commit_source_hint` when present.
   - Map `local_unpushed` to `commit_source: local_session` by default.
   - Map `upstream_reachable` to `commit_source: pulled_upstream` after confirming with the user that the commits were pulled coworker/shared-branch work rather than the user's own already-pushed commits.
   - Map `mixed` to `commit_source: mixed` after asking for a one-line note that separates local-session work from pulled/shared work.
   - Use `commit_source: unknown` when upstream reachability is unavailable or the user cannot classify it.
6. Parse changed-area `AGENTS.md` files for `## Verification scripts` tables and match rows against changed files in the checkpoint window.
   - Dedupe matching `Command` values in first-seen order.
   - Preserve matched `/run-playwright-tests` commands as Playwright-sensitive verification recommendations.
   - Do not run Playwright unless the user explicitly asks; this checkpoint command records status and recommendations.
   - Do not read or reveal `.env` values.
7. If Phase plan (`PHASES.md`) exists, perform a **phase-progress reconciliation**:
   - Identify the active phase from `## Current phase` (`- Active phase: ...`) and locate that phase in `## Phase details`.
   - Compare the new checkpoint summary, verification evidence, changed files, and any direct user notes against unchecked `- [ ]` items in the active phase's `In scope` and `Exit criteria` lists.
   - If matched Playwright commands exist, compare them against the active phase's conditional Playwright checkbox, verification evidence, and user notes.
   - Propose a minimal `PHASES.md` patch before writing. Only check boxes with explicit evidence from this session or an explicit user statement.
   - If any active-phase checkbox was completed but exit criteria remain open, set `- Status:` to `in-progress` unless it is already more specific.
   - If all active phase exit criteria are checked, ask before marking `- Status:` as `complete`.
   - If the active phase is complete and the next phase is listed in `## Phase index`, ask before advancing `- Active phase:` to that next phase and setting status to `planned`.
   - If evidence is insufficient, leave `PHASES.md` unchanged and say which phase checkpoints remain open.
8. Append the finalized checkpoint section to `LOG.md` with:
   - `reviewed_through: <head_commit>` (or update the line in the new section per your team convention)
   - `commit_source: <local_session|pulled_upstream|mixed|unknown>`
   - Branch lineage fields per `documentation/PATH_CONTRACT.md` § Branch lineage and commit windows:
     - `integration_base: origin/<base> (<merge-base-short>)`
     - `parent_branch: <remote/branch or none/unknown>`
     - `branch_delta: <N> commits from integration base`
     - `working_delta: <N> commits from parent/checkpoint to HEAD`
     - `reviewed_window: <start-short>..<head-short>`
   - Short bullet list: what changed in the `reviewed_window`, key files, verification, open risks
   - Playwright E2E status:
     - `Playwright E2E: not applicable` when no `/run-playwright-tests` rows matched
     - `Playwright E2E: recommended, not run - <command>` when rows matched but no evidence shows the command ran
     - `Playwright E2E: run - <command> - <pass|fail|unknown>` when verification evidence exists
   - Active phase and phase-progress result: `phases_updated: <yes|no|none>` plus a one-line rationale
   - If `branch_delta` is much larger than `working_delta`, explicitly state that the larger range is inherited branch history and not the checkpoint's new work.
9. Return confirmation with:
   - `LOG.md` path written and SHA recorded
   - `PHASES.md` path when present
   - `phases_updated: <yes|no|none>`
   - active phase before/after if it changed

Manual fallback (when tools are unavailable):
1. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`), load `<config-root>/projects/<resolved projectKey>/descriptor.json`, and expand `branchHandoff.contextDirTemplate` with the current branch name.
2. Read `HELPERS.json` when present, then locate Progress log (`LOG.md`) from the manifest or descriptor helper registry. If it is missing, ask whether to create it via `/project-helper`.
3. Determine HEAD sha via `git rev-parse HEAD`.
4. Determine the integration merge-base and commit counts when possible (`git merge-base HEAD origin/<base>`, `git rev-list --count origin/<base>..HEAD`, and a parent/checkpoint range if known).
5. Match changed files against changed-area `AGENTS.md` `## Verification scripts` rows and preserve any `/run-playwright-tests` commands as Playwright-sensitive recommendations.
6. If Phase plan (`PHASES.md`) exists, read it and run the same phase-progress reconciliation: propose checkbox/status/active-phase edits, require confirmation, and leave it unchanged when evidence is insufficient.
7. Open Progress log (`LOG.md`) directly and append a checkpoint section with lineage fields, `reviewed_through: <sha>`, `commit_source: <local_session|pulled_upstream|mixed|unknown>`, summary bullets, Playwright E2E status, phase-progress result, and timestamp.

Constraints:
- Keep `LOG.md` append-only; do not rewrite historical sections.
- Treat `PHASES.md` as the current plan/status board: only touch active-phase checkboxes plus the `## Current phase` status/active phase lines unless the user explicitly asks for broader planning edits.
- Do not silently mark phase work complete. A checkpoint can record progress without completing a phase.
- Pulled coworker commits may justify a `PHASES.md` proposal, but never auto-complete phase work from reachability alone.
- Do not auto-edit shared `AGENTS.md` from this command.
