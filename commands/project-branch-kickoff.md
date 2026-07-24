---
description: Scaffold a big project on an already-checked-out empty / new feature branch — phases, knowledge discovery, audit trail
subtask: false
---

Loads skills (when available): `branch-kickoff` (kickoff orchestration; loads `git-safety`), `plan-phases` (Senior Architect / PM lens for `PHASES.md`), `discover-knowledge` (Senior Architect lens for durable guidance).

Use when you are already on a fresh feature branch (zero commits ahead of base, or only kit-bookkeeping commits) and want the full kickoff scaffold: selected helper setup / refresh, Phase plan (`PHASES.md`) drafting, knowledge discovery, and optional audit trail. For creating a new branch from base, use `/project-branch-new` first; for plain feature work, use `/project-bootstrap` directly.

## Argument parsing

`$ARGUMENTS` may include, in any order:

- positional `$1` — `<projectKey>` (optional; auto-detected from cwd if omitted).
- `no-preflight` — skip drift gate + downstream knowledge preflight.
- `no-stash-check` — skip the stash reminder hook in `git-safety`.
- `no-source-guard` — bypass source-path existence guard in `/scaffold-knowledge`.
- `no-mermaid` — skip mermaid prompts on every artifact created during this run.
- `mode-hint-only` — do not run kickoff actions; return only a structured mode recommendation for demos.

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
   - Otherwise resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`), scan `<config-root>/projects/*/descriptor.json`, and match cwd against each `projectRootPath`. If exactly one matches, use that key. If zero or multiple match, prompt the user.

2. **Load `skills/branch-kickoff`.** The skill loads `skills/git-safety` and runs:
   - **Safety preflight** — clean tree, attached HEAD, base resolution, stash reminder hook. Refuses on dirty.
   - **Branch readiness gate** — confirm we are not on `main` / `master` (refuse with hint if so) and that we have either zero commits ahead of base or only kit-bookkeeping commits. If non-empty branch, prompt confirm: "Branch is N commits ahead of base; proceed with kickoff?" — recommend Yes only when commits are clearly bookkeeping (`HELPERS.json`, Progress log, Merge request context, Phase plan, etc.).
   - **Knowledge drift gate** — silent on 0 drifted `AGENTS.md`/`KNOWLEDGE.md` files; `M###` finding on 1–5; block-with-confirm on >5. Honors `no-preflight`. See `skills/branch-kickoff/SKILL.md` § Knowledge drift gate.
   - **Big-project criteria check** — if none match, recommend lighter `/project-bootstrap` + `/scaffold-knowledge` and stop.
   - **Model policy** — apply per `skills/branch-kickoff/SKILL.md` § Model policy.

   If any gate refuses or is declined, abort with the remediation hint and emit no audit entry.

   When presenting the big-project, mermaid, and model choices through a structured question UI, send `questions` as a native array of question objects, not a JSON-encoded string. See `skills/branch-kickoff/SKILL.md` § Kickoff confirmation prompts and `documentation/PATH_CONTRACT.md` § Interactive question prompts.

2.1. **Seed material resolution.**
   - Inspect the current user request and attachments for local file paths, `@file` mentions, pasted planning notes, issue/MR descriptions, or review reports.
   - If local path(s) were mentioned, resolve them relative to cwd when needed, verify readability, and ask whether to use them as primary seed material for Phase plan (`PHASES.md`) and Merge request context (`MERGE_REQUEST.md`) when those helpers are selected unless the user explicitly said to use them. Recommend yes.
   - If no seed material is detected, ask once: `Do you have a seed document, issue/MR description, or planning note to use before I draft phases and MR context?`
   - Read accepted seed material before running phase/MR drafting. Pass it through to `/project-bootstrap`, `/project-phases`, and any MR narrative update as primary source material when those helpers are selected.
   - Record the outcome as `seed_material: <paths|none declined|none unavailable>` in the kickoff banner and audit metadata. Do not draft generic phases or MR narrative while a mentioned seed document remains unread or unconfirmed.

2.5. **Mode hint dry-run (optional).**
   - If `mode-hint-only` is present, stop here and emit:
     - `recommended_mode_next: build` when branch is kickoff-ready and requirements are sufficiently stable.
     - `recommended_mode_next: plan` when drift, readiness uncertainty, or unresolved scope is detected.
   - Include one `why:` line and exit without running bootstrap/refresh/phases/scaffold/audit.

3. **Helper bootstrap or refresh.**
   - Run `/project-refresh <projectKey>` to inspect `HELPERS.json`, `existing_helpers`, `available_helpers`, and `helper_drift`.
   - If helper drift exists, ask whether to repair it via `/project-helper <projectKey>` before continuing. Recommend repairing only helpers needed for this kickoff.
   - Ask which kickoff helpers to create when missing, using plain-language labels:
     - Phase plan (`PHASES.md`): recommended for kickoff because it captures stages, exit criteria, and risk gates.
     - Progress log (`LOG.md`): recommended when the user wants an audit trail and future-session checkpoints.
     - Merge request context (`MERGE_REQUEST.md`): recommended only when the user wants local MR narrative or `## OpenCode:` blocks.
   - Run `/project-bootstrap <projectKey>` or `/project-helper <projectKey>` only for selected helpers. Do not create Progress log or Merge request context solely because kickoff can use them.
   - If the user skips Progress log or Merge request context, continue and mark the corresponding audit target as `skipped`.
   - Otherwise → run `/project-knowledge-refresh <projectKey>` to surface durable-knowledge updates.

4. **Plan phases.** Load `skills/plan-phases` and draft `PHASES.md` per its template.
   - **Recommendation in prompt:** 3–7 phases, each ≤ ~1 working week; carry one big risk per phase; vertical slices over horizontal layers.
   - Use accepted seed material as the primary source for the north star, phase ordering, already-complete work, open decisions, risks, and verification.
   - Pass `no-mermaid` through to `/project-phases` if the kickoff received it; otherwise the phases command applies its own mermaid policy (default ON when phases > 3).

5. **Knowledge discovery.** Run `/scaffold-knowledge <projectKey> dry-run` first as the audit trail of what would change, then prompt to promote to discovery.
   - **Recommendation in prompt:** Dry-run first, then promote to Discovery — preserves auditability.
   - Pass `no-source-guard` through to `/scaffold-knowledge` if the kickoff received it; otherwise the source-path guard runs by default.

6. **Mermaid policy hand-off.** The chained commands (`/project-phases`, `/project-knowledge-refresh`) apply their own mermaid policies as documented in `documentation/PATH_CONTRACT.md` § Mermaid policy. This kickoff command never injects mermaid into artifacts itself; it only orchestrates.

7. **Audit trail.** Per `skills/branch-kickoff` § Audit trail, append only to helpers that exist or that the user explicitly chose to create:
   - Progress log (`LOG.md`) block when the `log` helper exists:
     ```
     ### Kickoff <ISO timestamp>
     - command: /project-branch-kickoff
     - base: <base-branch>
     - new branch: <current-branch>
     - integration_base: origin/<base> (<merge-base-short>)
     - parent_branch: <remote/branch or none/unknown>
     - branch_delta: <N> commits from integration base
     - working_delta: <N> commits from parent/checkpoint to HEAD
     - reviewed_window: <start-short>..<head-short>
     - model: <selected> (fallback: <fallback or none>)
     - mermaid: phases=<bool> review=<bool> mr=<bool>
     - seed_material: <paths|none declined|none unavailable>
     - confirmations: bootstrap-or-refresh, plan-phases, scaffold-dry-run, scaffold-discovery
     - drift_finding: <count or none>
     ```
   - On stacked branches, summarize the narrow `working_delta` and explicitly label the larger integration-base range as inherited history.
   - Merge request context (`MERGE_REQUEST.md`) `## OpenCode:` block with the same metadata when the `merge_request` helper exists; link to first phase if Phase plan (`PHASES.md`) was newly created.
   - If either helper is absent, do not create it silently; report `audit_log_path: skipped` or `audit_mr_path: skipped`.

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
- seed_material: <paths|none declined|none unavailable>
- phases_drafted: <yes|no> (path: <path or n/a>)
- scaffold_dry_run: <count of leaves preview>
- scaffold_discovery: <count of leaves written>
- audit_log_path: <path to LOG.md|skipped>
- audit_mr_path: <path to MERGE_REQUEST.md|skipped>
- next_step:
  - Open <path to PHASES.md> and confirm the active phase
  - <follow-up 2>
  - ...
```

When `mode-hint-only` is set, emit exactly:

```
## Mode hint
- recommended_mode_next: <plan|build>
- why: <short rationale>
- explicit_switch: required
```

## Constraints

- **No auto-stash.** Safety preflight refuses on dirty tree; user must commit, stash, or discard.
- **No destructive ops.** No `reset --hard`, `clean -fd`, or force-push.
- **No shell injection from `$ARGUMENTS`.** Project key is validated against `^[A-Za-z0-9_-]+$` before use.
- **Audit fields are structured only.** No PII.
- **Confirmation discipline.** Each chained command (`/project-bootstrap`, `/project-knowledge-refresh`, `/project-phases`, `/scaffold-knowledge`) is launched after its own one-line preview + confirm; aggregate confirms apply only to read-only sequences.
- **No skill recursion.** This command loads three skills; the skills do not load other skills (sole exception: `git-safety` is a foundational primitive, loaded by `branch-kickoff`).
- **Mermaid never in `## OpenCode:` blocks.** Per kit-wide policy.
