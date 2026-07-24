# Generic handoff rule (descriptor-driven)

Use with `$OPENCODE_HOME/projects/<projectKey>/descriptor.json` (`OPENCODE_HOME` defaults to `~/.config/opencode`). Continuity is **file + command** driven.

## MUST

1. **Resolve project** from the active workspace: load the descriptor for the matching `projectKey` (see kit README for layout).
2. **Resolve branch and context** with Git plus `branchHandoff.contextDirTemplate`. The descriptor may select private, shared-in-repository, or custom storage; never infer a second context root or merge contexts automatically.
3. **Never mix** helper files (`MERGE_REQUEST.md`, `MR.md`, `LOG.md`, `PHASES.md`, `REVIEW.md`, `HELPERS.json`) across branches.
4. **Modes**
   - **tracked** (default): optional branch helpers selected from `branchHandoff.helpers` and tracked in branch-local `HELPERS.json`.
   - **lite**: no required branch files; refresh uses a **recent-commit git window** and minimal `reread_files` (project + area agents when present). Use for short or low-risk sessions.
5. **Session start**: run `/project-refresh <projectKey>` (or `/manual-refresh <projectKey>` if wrappers are unavailable). If helper files are missing, moved, untracked, or intentionally absent, use `/project-helper <projectKey>` to create, relink, mark removed, or skip them. `/project-bootstrap` provides the same guarded creation flow through an activated wrapper or its manual fallback.
6. **Before substantial work**: refresh again after branch switch, rebase, squash, or history rewrite.
7. **Follow refresh output**: obey `reread_files`, `changed_areas`, helper drift, review-path partitions, synchronization state, and boolean nudges (`log_append_recommended`, `mr_update_recommended`, `needs_checkpoint`). `mr_update_recommended` is review-driven (a review helper with open/stale findings), not a per-change nudge; when acting on it, cite the triggering signal. Treat `narrative_drift_suspected` as an advisory only — surface it for a human decision and never auto-edit change-request narrative.
8. **If `agents_stale_vs_branch` is true**: re-read project `AGENTS.md` carefully; shared conventions may have moved on `main` (or `baselineBranchForMaterialChanges`).
9. **Logging (tracked only)**: append the helper with role `log` after substantial work, verification, or refresh when `log_append_recommended` is true. Keep progress logs append-only.
10. **Promotion**: keep discoveries in the branch progress-log helper first. Project operating rules belong in project `AGENTS.md`; durable area/leaf facts belong in `KNOWLEDGE.md`. Promote only when stable and user-approved.
11. **Refresh is read-only**: `/project-refresh` and `/manual-refresh` MUST only gather and report context. During refresh, NEVER run tests, make code changes, or run follow-up commands. If the user only asked for refresh, wait after reporting. If the user already requested follow-up work, continue after the refresh result is reported.
12. **Structured output**: when executing `/project-refresh` or `/manual-refresh`, output the `## Handoff refresh result` structured block FIRST (as defined in the command template), then optionally add narrative. Never skip or reorganize the structured block.
13. **Subtask handoff to main agent**: when a lifecycle command runs as a subtask (for example `/project-init`, `/project-bootstrap`, `/project-review`, `/project-checkpoint`, `/project-close`, `/project-phases`, `/project-knowledge-refresh`, `/scaffold-knowledge`), the main agent MUST restate the subtask's recommended next commands in plain text before waiting for user input.
14. **Surface generated artifacts**: after creating or updating a user-facing artifact, open it when the host supports file opening. Otherwise return the exact path.

## SHOULD

- Run `/project-review <projectKey>` after refresh when the branch has reviewable changes — generates a checklist, diff summary, or both (user chooses).
- Run `/project-checkpoint <projectKey>` before pausing on a long task; `/project-close <projectKey>` when wrapping a session (tracked).
- Run `/project-cleanup-candidates <projectKey>` periodically to review stale branch folders.
- Run `/project-knowledge-refresh <projectKey>` when you have stable, merge-worthy knowledge to promote (proposal-first).
- If the user says **done / bye / pause / ttyl**, attempt `/project-close` behavior inline when in **tracked** mode (best effort; not a substitute for hooks).

## Models (optional)

- Use the active session model unless the local installation explicitly defines `descriptor.subtaskModels` or per-command routing.
- Keep routing in deployment configuration, not shared upstream rules.
- Route by workload profile: economy for bounded mechanical work, balanced for normal implementation and lifecycle work, and frontier for ambiguous, broad, or high-risk decisions.
- Evaluate local quality and actual token telemetry before changing a default; public list prices alone do not measure retry cost or correctness.
- Do not ask for a model on every subtask; ask only when the user must make a meaningful cost or capability choice.
- See `documentation/MODEL_ROUTING_AND_COST.md` for provider-neutral profiles, current price examples, cache behavior, and escalation guidance.

## Merge closure (tracked)

When a branch is merged to the baseline, ask the user: **archive** (keep folder) vs **promote-and-delete** (promote durable notes, then remove folder). Never delete without explicit confirmation.
