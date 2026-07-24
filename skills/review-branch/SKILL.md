---
name: review-branch
description: Orchestrate a branch review with context refresh, review lifecycle detection, REVIEW.md generation or preserve-update, optional verification, and optional MR sync into OpenCode blocks
---

## What I do

Guide a systematic branch review: refresh context, detect whether `REVIEW.md` is new/current/stale, generate or preserve-update a lean `REVIEW.md` (with `F/R/M###` findings triage), optionally run automated checks, then optionally align `MERGE_REQUEST.md` **`## OpenCode:`** sections - with **explicit decision points** so verification is never silent or mandatory.

## When to use me

- You are reviewing a branch before merge
- You want a review artifact for a colleague
- After completing a feature, before opening or updating a merge request

## Workflow

### 1. Gather context

Run `/manual-refresh` (or `/project-refresh` only when the Bun tools are explicitly enabled and working) to understand:

- What branch you are on and what changed
- Which areas are affected
- Current branch context files (`MERGE_REQUEST.md`, `LOG.md`, `PHASES.md` if present, `REVIEW.md` if present)
- Review lifecycle state from refresh output when available: `review_present`, `review_state`, `reviewed_head`, `head_has_moved_since_review`, and open `F/R/M###` ids

### 2. Choose review lifecycle action

Treat `REVIEW.md` as the source of truth for review state. Treat `LOG.md` as an audit trail, not the decision authority.

Use this state machine:

| State | Action |
| --- | --- |
| `new_review` | Create `REVIEW.md`. |
| `existing_current` | Continue triage by default; regenerate only if the user asks for refresh/replace. |
| `existing_head_moved` | Run `/project-review` in preserve mode: keep existing triage, append only new findings for new risk. |
| `existing_unknown_head` | Preserve cautiously, add review metadata, and append only high-confidence new findings. |

Preserve legacy `F-xx` ids in existing artifacts without renumbering. Allocate new findings only from the three-digit `F`, `R`, and `M` namespaces.

### 3. Gather review focus

Ask once for extra focus only when the user has not already supplied it:

```text
Any specific review focus or extra context? Examples: security, migration safety, tests, performance, UX, API compatibility. Say "none" to use MR + LOG + diff only.
```

If `MERGE_REQUEST.md` already has clear acceptance criteria, phrase the prompt as "Any extra review focus beyond those?" Use the answer to bias prioritization, store it under `## Notes for reviewer`, and still report serious risks outside the focus.

### 4. Generate or refresh the review artifact

Run `/project-review`:

- Prefer **Lean findings** for normal branch review. Use **Full checklist + diff** only when the user explicitly needs a durable walkthrough for a large/shared review (see `commands/project-review.md` in this kit).
- If `REVIEW.md` already exists, default to **preserve** so human triage is not lost. Replace only when explicitly requested.
- Ensure generated artifacts include `OpenCode: review metadata` with `reviewed_head`, `reviewed_window`, `artifact_type`, `findings_merge_mode`, and `review_focus`.
- Let `/project-review` append its compact `LOG.md` review audit entry when tracked context is writable.

### 5. Human triage

Edit `REVIEW.md`:

- Update **`### Triage checklist (by Id)`** for each `F/R/M###` item.
- Keep findings scoped to **risks / follow-ups**, not every MR checkbox. Checklist sections exist only in full-review artifacts.

### 6. Optional checkpoint

Run `/project-checkpoint` with a short note (e.g. "review stopped at F003") so the next session can resume from `LOG.md`.

### 7. Optional automated verification

Prefer deterministic recommendations from structured area knowledge before offering generic checks.

1. Parse each changed area's area-level `AGENTS.md` for a `## Verification scripts` block using the structured-knowledge-table schema (`Trigger | Command | When`).
2. Match each row's `Trigger` glob against `git diff --name-only` for the current review window.
3. Treat `(added or modified)` as an extra qualifier: trigger only when at least one matching file is added or modified.
4. Dedupe matched `Command` values, preserving first-seen order.
5. Present those commands first as **recommended verifications** (still optional; do not auto-run).

Fallback behavior when the block is absent for a changed area:

- Emit one finding: `M###`, severity `Note`, finding "Missing verification scripts block in <area>/AGENTS.md".
- Suggested action: "Add `## Verification scripts` manually in the project-owned area rules, using `project-rules/<projectKey>/<area>/AGENTS.md` as the template source when available."
- Offer generic checks as fallback only:
  - `/check-types` (per affected area or cwd)
  - `/run-tests`
  - `/lint-fix`

If a project's docs describe a single bundled script that runs multiple checks, offer it as one alternative. Never assume such a script exists.

### 8. Optional MR alignment

Ask whether to refresh MR machine blocks:

- **`/project-update-mr`** — git facts + `OpenCode:` sections from `REVIEW.md` / `LOG.md`
- **`/project-review-sync`** - lighter pass: merge MR checklist deltas into full-review artifacts when present, optional append-only `F/R/M###`, then refresh `OpenCode:` blocks - use when MR text or commits changed but a full `/project-review` pass is not needed

Skip both if the team keeps MR updates fully manual.

### 9. Summary

Present:

- Review lifecycle state and whether `HEAD` moved since the previous review
- Open vs resolved `F/R/M###` items
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

Apply this lens during review artifact generation and human triage. Each cluster produces zero or more `F/R/M###` findings with severity + suggested action, populated into the existing `## Review findings` table.

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

- Does the change honor existing area `AGENTS.md` and leaf `KNOWLEDGE.md` boundaries?
- Any new cross-area imports / aliases? Any new public API surface? Any new shared data model?
- Would a future agent reading the leaf `KNOWLEDGE.md` recognize this pattern, or does the file need an update?
- Is the change biased toward a minimum durable change, or does it speculatively expand scope?

### DX / blast radius

- Does local lint / typecheck / test still pass for affected areas?
- Migration: data migrations, backfills, feature flags, dual writes, ramp plans.
- Breaking change risk for downstream consumers (callers, fixtures, snapshots, generated clients).
- Rollback path: is the change reversible at PR scope, requires a follow-up migration, or irreversible?
- Observability: logs, metrics, traces — added where the change is most likely to misbehave?

### Knowledge alignment

- Does the change invalidate area `AGENTS.md` or leaf `KNOWLEDGE.md` content? If yes, propose `/project-knowledge-refresh` and flag as `M###` "Knowledge stale".
- Did the preflight in `/project-review` report `missing` or `stale` leaves? Reflect those as `M###` findings or risks. `/project-review` is report-only and must not scaffold knowledge.

### Output mapping

For every concern raised by the lenses above:

- **Severity** = `Blocker | High | Medium | Low | Note` based on impact and likelihood.
- **Kind / id** = `F###` for fixes, `R###` for refinements, `M###` for knowledge or `AGENTS.md` misalignment.
- **Suggested action** = the smallest concrete next step (file, function, command).
- **Triage** starts at `open`; humans flip to `valid | invalid | fixed | wontfix | followup`.

Respect the existing 25-row cap in `commands/project-review.md`; the senior lens is meant to **focus** the table, not flood it.

## Related docs

- Scenarios: `documentation/WORKFLOW.md`
- Commands: `documentation/COMMAND_WORKFLOW.md`
- Baseline persona: `rules/SENIOR_ENGINEERING.md`
