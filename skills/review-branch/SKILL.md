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

**Ask the user** whether to run any of:

- `/check-types` (per affected area or cwd)
- `/run-tests`
- `/lint-fix`

**Or skip all** when the review is documentation-only or time-boxed.

If the project’s own docs (`AGENTS.md`, team handoff, or overlay) describe a **single bundled script** that runs multiple checks, you may offer that as **one** alternative to the three commands — do not assume every repo has such a script.

### 6. Optional MR alignment

Ask whether to refresh MR machine blocks:

- **`/project-update-mr`** — git facts + `OpenCode:` sections from `REVIEW.md` / `LOG.md`
- **`/project-review-sync`** — lighter pass: merge MR checklist deltas into `REVIEW.md`, optional append-only `F-xx`, then refresh `OpenCode:` blocks — use when MR text or commits changed but a full `/project-review` pass is not needed

Skip both if the team keeps MR updates fully manual.

### 7. Summary

Present:

- Open vs resolved `F-xx` items
- Verification outcome (or “skipped by user”)
- What changed in `MERGE_REQUEST.md` `OpenCode:` sections (or “not updated”)

## Decision points

- If the branch is trivial (one file, doc-only), offer **Diff-first review** or skip appendix statistics.
- If typecheck or tests would take a long time, confirm scope before running.
- If failures look **pre-existing**, separate them from branch regressions in the summary.

## Related docs

- Scenarios: `WORKFLOW.md` (repo root)
- Commands: `COMMAND_WORKFLOW.md` (repo root)
