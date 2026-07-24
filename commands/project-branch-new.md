---
description: Create a new branch from the latest integration base, then optionally chain into project-branch-kickoff
subtask: false
---

Loads skills (when available): `branch-kickoff` (kickoff orchestration), which itself loads `git-safety` (safety preflight, base resolution, `opencode-kit` stash convention).

Use when you are on any branch and want a brand-new branch off the latest integration base. For scaffolding an already-checked-out empty branch, use `/project-branch-kickoff` directly.

## Argument parsing

`$ARGUMENTS` may include, in any order:

- positional `$1` — new branch name (optional; if omitted, the command prompts).
- `no-preflight` — skip drift / knowledge preflight gates downstream.
- `no-stash-check` — skip the stash reminder hook in `git-safety`.
- `no-mermaid` — skip mermaid prompts on any artifact created during the chained kickoff.

Fail closed on any other token: surface the unknown flag and refuse to proceed without confirmation.

**Security rule:** never interpolate `$ARGUMENTS` or `$1` into shell-injection blocks; validate the branch name against `^[A-Za-z0-9_][A-Za-z0-9_./-]*$` before passing it to git. Reject names containing `;`, `&`, `|`, backticks, `$`, or whitespace.

## Read-only state anchors

Bind these fixed shell injections into the prompt before the safety preflight; they anchor the agent in real state without delegating to the agent.

```
!`git status --porcelain`
!`git symbolic-ref --quiet HEAD || echo DETACHED`
!`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
```

## Workflow

1. **Load `skills/branch-kickoff`.** The skill loads `skills/git-safety` and runs the safety preflight (clean tree, attached HEAD, base resolution, stash reminder hook). If preflight refuses, abort with the remediation hint and emit no audit entry.

2. **Resolve the new branch name.**
   - If `$1` is provided, validate it (see security rule above) and use it.
   - Otherwise prompt for a name.
   - **Recommendation in prompt:** kebab-case `<scope>/<short-goal>` (e.g. `feature/api-redact-pii`); short rationale: matches kit convention, easier to scan.

3. **Confirm the integration base.** Surface the `git-safety` resolved base.
   - **Recommendation in prompt:** accept the detected base; only override if you know the repo uses a non-standard integration branch.

4. **Confirm-per-step git operations.** Each step gets a one-line preview followed by an explicit confirm. Aggregate confirms are not allowed for state-changing ops.
   1. `git fetch origin` — preview / confirm / run.
   2. `git checkout <base>` — preview / confirm / run.
   3. `git pull --ff-only` — preview / confirm / run. On non-fast-forward, abort with a remediation hint ("base diverged locally; rebase or reset before continuing"). Do **not** force.
   4. `git checkout -b <new-branch>` — preview / confirm / run. If the branch already exists, abort with a remediation hint ("branch exists; pick a different name or check it out manually").

5. **Apply the execution-profile policy** per `skills/branch-kickoff` § Model policy. Use the active session model by default. If the user explicitly requests an override, surface availability/fallback and trust-boundary warnings without recommending a named model or service.

6. **Big-project criteria check.** Confirm the work qualifies as "big" by the criteria in `skills/branch-kickoff` § Big-project criteria. If not, recommend the lighter `/project-bootstrap` + `/scaffold-knowledge` pair instead and stop here without chaining.

7. **Optional chain into `/project-branch-kickoff`.**
   - **Default + recommendation:** chain when big-project criteria match.
   - If declined, stop after the audit step (step 9). User can run `/project-branch-kickoff` later.

8. **Optional helper bootstrap / refresh decision** (only if chaining):
   - Run `/project-refresh <projectKey>` first to inspect `existing_helpers`, `available_helpers`, and `helper_drift`.
   - If helpers needed by the chained kickoff are missing, ask whether to create them through `/project-bootstrap <projectKey>` or `/project-helper <projectKey>`.
   - Treat the answer as the branch's selected helpers for kickoff; do not infer a full helper set from the command name.
   - Recommended helper set for a full kickoff: Phase plan (`PHASES.md`) for planning, Progress log (`LOG.md`) for audit checkpoints, and Merge request context (`MERGE_REQUEST.md`) only when the user wants local MR narrative / OpenCode blocks.
   - If the user skips Progress log or Merge request context, proceed with the kickoff but mark the corresponding audit target as `skipped`.
   - Otherwise → run `/project-knowledge-refresh <projectKey>` to surface durable-knowledge updates.
   - **Recommendation in prompt:** create only the helpers the user wants for this branch; do not create audit helpers implicitly.

9. **Audit trail.** Per `skills/branch-kickoff` § Audit trail, append only to helpers that exist or that the user explicitly chose to create:
   - Progress log (`LOG.md`) block when the `log` helper exists:
     ```
     ### Kickoff <ISO timestamp>
     - command: /project-branch-new
     - base: <base-branch>
     - new branch: <new-branch>
     - model: <selected> (fallback: <fallback or none>)
     - mermaid: phases=<bool> review=<bool> mr=<bool>     # populated by chained command if applicable
     - confirmations: fetch, checkout-base, pull-ff, checkout-new
     ```
   - Merge request context (`MERGE_REQUEST.md`) `## OpenCode:` block with the same metadata when the `merge_request` helper exists.
   - If either helper is absent, do not create it silently; record `audit_log_path: skipped` or `audit_mr_path: skipped`.

   **Security rule:** audit fields are structured only. Never include free-text user prompts, the branch description, or the ticket title verbatim. Branch name is allowed.

## Output format (MUST use exactly)

```
## Branch new result
- project_key: <projectKey>
- base: <base-branch>
- new_branch: <new-branch>
- model: <selected> (fallback: <fallback or none>)
- chained_kickoff: <yes|no>
- audit_log_path: <path to LOG.md|skipped>
- audit_mr_path: <path to MERGE_REQUEST.md|skipped|n/a>
- next_step: </project-branch-kickoff <projectKey> | manual implementation>
```

## Constraints

- **No auto-stash.** If the working tree is dirty, the safety preflight refuses; the user must commit, stash, or discard before re-running.
- **No destructive ops.** `reset --hard`, `clean -fd`, force-push are never run from this command.
- **No shell injection from `$ARGUMENTS`.** Branch name validation is mandatory; any unsafe character aborts the flow.
- **Audit fields are structured only.** No PII, no free-text user prompts.
- **Confirmation discipline.** Each git mutation gets its own one-line preview + confirm; aggregate confirms apply only to read-only sequences.
