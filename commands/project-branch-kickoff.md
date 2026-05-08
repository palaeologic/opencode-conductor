---
description: Scaffold a big project on an already-checked-out empty / new feature branch — phases, knowledge discovery, audit trail
subtask: false
---

Loads skills (when available): `branch-kickoff` (kickoff orchestration; loads `git-safety`), `plan-phases` (Senior Architect / PM lens for `PHASES.md`), `discover-knowledge` (Senior Architect lens for `AGENTS.md`).

Use when you are already on a fresh feature branch (zero commits ahead of base, or only kit-bookkeeping commits) and want the full kickoff scaffold: bootstrap / refresh, `PHASES.md` draft, knowledge discovery, audit trail. For creating a new branch from base, use `/project-branch-new` first; for plain feature work, use `/project-bootstrap` directly.

## Argument parsing

`$ARGUMENTS` may include, in any order:

- positional `$1` — `<projectKey>` (optional; auto-detected from cwd if omitted).
- `no-preflight` — skip drift gate + downstream knowledge preflight.
- `no-stash-check` — skip the stash reminder hook in `git-safety`.
- `no-source-guard` — bypass source-path existence guard in `/scaffold-knowledge`.
- `no-mermaid` — skip mermaid prompts on every artifact created during this run.

Fail closed on any other token. **Security rule:** never interpolate `$ARGUMENTS` or `$1` into `!`...`` shell-injection blocks.

## Read-only state anchors

Bind these fixed shell injections into the prompt before the safety preflight; they anchor the agent in real state without delegating to the agent.

```
!`git status --porcelain`
!`git symbolic-ref --quiet HEAD || echo DETACHED`
!`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
!`git rev-list --count $(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main)..HEAD 2>/dev/null || echo 0`
```

The last invocation produces "commits ahead of base" so the readiness gate (step 2) sees real state.

## Workflow

1. **Project key resolution.**
   - If `$1` is provided, use it.
   - Otherwise auto-detect by scanning `~/.config/opencode/projects/*/descriptor.json` and matching cwd against each `projectRootPath`. If exactly one matches, use that key. If zero or multiple match, prompt the user.

2. **Load `skills/branch-kickoff`.** The skill loads `skills/git-safety` and runs:
   - **Safety preflight** — clean tree, attached HEAD, base resolution, stash reminder hook. Refuses on dirty.
   - **Branch readiness gate** — confirm we are not on `main` / `master` (refuse with hint if so) and that we have either zero commits ahead of base or only kit-bookkeeping commits. If non-empty branch, prompt confirm: "Branch is N commits ahead of base; proceed with kickoff?" — recommend Yes only when commits are clearly bookkeeping (LOG.md, MERGE_REQUEST.md, etc.).
   - **Knowledge drift gate** — silent on 0 drifted AGENTS.md files; F-xx finding on 1–5; block-with-confirm on >5. Honors `no-preflight`. See `skills/branch-kickoff/SKILL.md` § Knowledge drift gate.
   - **Big-project criteria check** — if none match, recommend lighter `/project-bootstrap` + `/scaffold-knowledge` and stop.
   - **Model policy** — apply per `skills/branch-kickoff/SKILL.md` § Model policy.

   If any gate refuses or is declined, abort with the remediation hint and emit no audit entry.

3. **Bootstrap or refresh.**
   - Inspect the descriptor's branch-context folder (`branchHandoff.contextDirTemplate` expanded for the current branch).
   - If the folder does not exist or `MERGE_REQUEST.md` / `LOG.md` are missing → run `/project-bootstrap <projectKey>`.
   - Otherwise → run `/project-knowledge-refresh <projectKey>` to surface durable-knowledge updates.
   - **Recommendation in prompt:** bootstrap when descriptor / state is missing; refresh otherwise.

4. **Plan phases.** Load `skills/plan-phases` and draft `PHASES.md` per its template.
   - **Recommendation in prompt:** 3–7 phases, each ≤ ~1 working week; carry one big risk per phase; vertical slices over horizontal layers.
   - Pass `no-mermaid` through to `/project-phases` if the kickoff received it; otherwise the phases command applies its own mermaid policy (default ON when phases > 3).

5. **Knowledge discovery.** Run `/scaffold-knowledge <projectKey> dry-run` first as the audit trail of what would change, then prompt to promote to discovery.
   - **Recommendation in prompt:** Dry-run first, then promote to Discovery — preserves auditability.
   - Pass `no-source-guard` through to `/scaffold-knowledge` if the kickoff received it; otherwise the source-path guard runs by default.

6. **Mermaid policy hand-off.** The chained commands (`/project-phases`, `/project-knowledge-refresh`) apply their own mermaid policies as documented in `docs/PATH_CONTRACT.md` § Mermaid policy. This kickoff command never injects mermaid into artifacts itself; it only orchestrates.

7. **Audit trail.** Per `skills/branch-kickoff` § Audit trail, append:
   - `LOG.md` block:
     ```
     ### Kickoff <ISO timestamp>
     - command: /project-branch-kickoff
     - base: <base-branch>
     - new branch: <current-branch>
     - model: <selected> (fallback: <fallback or none>)
     - mermaid: phases=<bool> review=<bool> mr=<bool>
     - confirmations: bootstrap-or-refresh, plan-phases, scaffold-dry-run, scaffold-discovery
     - drift_finding: <count or none>
     ```
   - `MERGE_REQUEST.md` `## OpenCode:` block with the same metadata; link to first phase if `PHASES.md` was newly created.

   **Security rule:** audit fields are structured only. No PII, no free-text user prompts.

8. **Emit next-step checklist.** Suggest follow-ups (e.g. open `PHASES.md` to confirm the active phase; run `/project-update-mr` once narrative sections are filled in; rerun `/project-knowledge-refresh` after the first substantial work session).

## Output format (MUST use exactly)

```
## Branch kickoff result
- project_key: <projectKey>
- branch: <current-branch>
- base: <base-branch>
- model: <selected> (fallback: <fallback or none>)
- big_project_criteria_matched: <count> of 4
- drift_finding: <count or none>
- bootstrap_or_refresh: <bootstrap|refresh>
- phases_drafted: <yes|no> (path: <path or n/a>)
- scaffold_dry_run: <count of leaves preview>
- scaffold_discovery: <count of leaves written>
- audit_log_path: <path to LOG.md>
- audit_mr_path: <path to MERGE_REQUEST.md>
- next_step:
  - Open <path to PHASES.md> and confirm the active phase
  - <follow-up 2>
  - ...
```

## Constraints

- **No auto-stash.** Safety preflight refuses on dirty tree; user must commit, stash, or discard.
- **No destructive ops.** No `reset --hard`, `clean -fd`, or force-push.
- **No shell injection from `$ARGUMENTS`.** Project key is validated against `^[A-Za-z0-9_-]+$` before use.
- **Audit fields are structured only.** No PII.
- **Confirmation discipline.** Each chained command (`/project-bootstrap`, `/project-knowledge-refresh`, `/project-phases`, `/scaffold-knowledge`) is launched after its own one-line preview + confirm; aggregate confirms apply only to read-only sequences.
- **No skill recursion.** This command loads three skills; the skills do not load other skills (sole exception: `git-safety` is a foundational primitive, loaded by `branch-kickoff`).
- **Mermaid never in `## OpenCode:` blocks.** Per kit-wide policy.
