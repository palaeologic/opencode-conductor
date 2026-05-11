---
name: review-branch
description: Orchestrate a branch review with context refresh, REVIEW.md generation, optional verification, and optional MR sync into OpenCode blocks
---

## What I do

Guide a systematic branch review: refresh context, generate or update `REVIEW.md` (with `F-xx` findings triage), optionally run automated checks, then optionally align `MERGE_REQUEST.md` **`## OpenCode:`** sections — with **explicit decision points** so verification is never silent or mandatory.

## When to use me

- You are reviewing a branch before merge
- You want a review artifact for a colleague
- After completing a feature, before opening or updating a merge request

## Workflow

### 1. Gather context

Run `/manual-refresh` (or `/project-refresh` if tools are available) to understand:

- What branch you are on and what changed
- Which areas are affected
- Current branch context files (`MERGE_REQUEST.md`, `LOG.md`, `REVIEW.md` if present)

### 2. Generate or refresh the review artifact

Run `/project-review`:

- Prefer **Checklist + diff (full)** for shared / senior review on non-trivial branches (see `commands/project-review.md` in this kit).
- If `REVIEW.md` already exists, choose **merge** vs full replace and **findings preserve** (default) vs **replace** so human triage is not lost.

### 3. Human triage

Edit `REVIEW.md`:

- Update **`### Triage checklist (by Id)`** for each `F-xx`
- Keep questions in the findings table scoped to **risks / follow-ups**, not every MR checkbox (checklist section holds acceptance)

### 4. Optional checkpoint

Run `/project-checkpoint` with a short note (e.g. “review stopped at F-03”) so the next session can resume from `LOG.md`.

### 5. Optional automated verification

Prefer deterministic recommendations from structured area knowledge before offering generic checks.

1. Parse each changed area's **active area document** (descriptor: **`areaKnowledgePath`**, else sibling **`KNOWLEDGE.md`** next to **`areaAgentsPath`**, else **`areaAgentsPath`**) for a `## Verification scripts` block using the structured-knowledge-table schema (`Trigger | Command | When`).
2. Match each row's `Trigger` glob against `git diff --name-only` for the current review window.
3. Treat `(added or modified)` as an extra qualifier: trigger only when at least one matching file is added or modified.
4. Dedupe matched `Command` values, preserving first-seen order.
5. Present those commands first as **recommended verifications** (still optional; do not auto-run).

Fallback behavior when the block is absent for a changed area:

- Emit one finding: `F-xx`, severity `Note`, question "Missing verification scripts block in the active area document for `<area>` (see `areaKnowledgePath` / sibling KNOWLEDGE / `areaAgentsPath` in `descriptor.json`)."
- Suggested action: "Add `## Verification scripts` table or run `/scaffold-knowledge <projectKey>` to seed one."
- Offer generic checks as fallback only:
  - `/check-types` (per affected area or cwd)
  - `/run-tests`
  - `/lint-fix`

If a project's docs describe a single bundled script that runs multiple checks, offer it as one alternative. Never assume such a script exists.

### 6. Optional MR alignment

Ask whether to refresh MR machine blocks:

- **`/project-update-mr`** — git facts + `OpenCode:` sections from `REVIEW.md` / `LOG.md`
- **`/project-review-sync`** — lighter pass: merge MR checklist deltas into `REVIEW.md`, optional append-only `F-xx`, then refresh `OpenCode:` blocks — use when MR text or commits changed but a full `/project-review` pass is not needed

Skip both if the team keeps MR updates fully manual.

### 7. Summary

Present:

- Open vs resolved `F-xx` items
- Verification outcome (or "skipped by user")
- What changed in `MERGE_REQUEST.md` `OpenCode:` sections (or "not updated")
- Next-step recommendation (never automatic):
  - Recommend proceeding with implementation when findings are narrow and implementation-ready.
  - Recommend further planning when findings reveal unresolved design or cross-area decisions.

## Decision points

- If the branch is trivial (one file, doc-only), offer **Diff-first review** or skip appendix statistics.
- If typecheck or tests would take a long time, confirm scope before running.
- If failures look **pre-existing**, separate them from branch regressions in the summary.

## Senior Reviewer lens

Apply this lens during step 2 (`/project-review`) and step 3 (human triage). Each cluster produces zero or more `F-xx` findings with severity + suggested action, populated into the existing `## Review findings / questions` table.

### Correctness

- Does the change deliver what the MR says? Does the implementation match the acceptance checklist?
- Edge cases: empty inputs, max-size inputs, off-by-one, NaN / undefined / null, concurrent paths, partial failures.
- Failure paths: are errors caught, surfaced, and tested? Are retries idempotent?
- Race conditions: shared state, async ordering, stale reads, locks vs events.

### Security

- **Input validation** at trust boundaries (HTTP, GraphQL, message bus, file uploads).
- **Authn / authz** boundaries: are authorization checks enforced near the data, not just at the edge?
- **Secrets**: no tokens / keys in code, logs, or knowledge files; check `.env` and config.
- **Path traversal**, **SSRF**, **deserialization**, **SQL/NoSQL injection**, **template injection**.
- **Dependency provenance**: new deps from reputable sources, pinned versions, no unexpected post-install scripts.
- **Supply chain**: lockfile changes, registry sources, license shifts.

### Maintainability

- Naming clarity (intent over abbreviation), layering respected, dead code removed.
- Duplication: introduce abstraction only when there are 2+ real callers and the abstraction is obvious.
- Comments explain **intent / constraints**, not narrate code.
- Tests cover **behavior**, not implementation; renaming a private symbol shouldn't break tests.
- New invariants are documented (in code as guards or in `AGENTS.md`).

### Performance

- N+1 query patterns, allocation hotspots, sync IO on hot paths.
- Missing indexes, scan-on-write, large payloads on critical paths.
- Request fan-out and timeout / retry behavior.
- Cache invalidation: who owns it, when does it run, what could go stale?

### Architecture impact

- Does the change honor existing area / leaf boundaries from `AGENTS.md`?
- Any new cross-area imports / aliases? Any new public API surface? Any new shared data model?
- Would a future agent reading the leaf `AGENTS.md` recognize this pattern, or does the file need an update?
- Is the change biased toward a minimum durable change, or does it speculatively expand scope?

### DX / blast radius

- Does local lint / typecheck / test still pass for affected areas?
- Migration: data migrations, backfills, feature flags, dual writes, ramp plans.
- Breaking change risk for downstream consumers (callers, fixtures, snapshots, generated clients).
- Rollback path: is the change reversible at PR scope, requires a follow-up migration, or irreversible?
- Observability: logs, metrics, traces — added where the change is most likely to misbehave?

### Knowledge alignment

- Does the change invalidate any `AGENTS.md` content? If yes, propose `/project-knowledge-refresh` and flag as `F-xx` "Knowledge stale".
- Did the preflight in `/project-review` report `created` or `stale` leaves? Reflect those in findings or risks.

### Output mapping

For every concern raised by the lenses above:

- **Severity** = `Blocker | High | Medium | Low | Note` based on impact and likelihood.
- **Suggested action** = the smallest concrete next step (file, function, command).
- **Triage** starts at `open`; humans flip to `valid | invalid | fixed | wontfix | followup`.

Respect the existing 25-row cap in `commands/project-review.md`; the senior lens is meant to **focus** the table, not flood it.

## Related docs

- Scenarios: `documentation/WORKFLOW.md`
- Commands: `documentation/COMMAND_WORKFLOW.md`
- Baseline persona: `rules/SENIOR_ENGINEERING.md`
