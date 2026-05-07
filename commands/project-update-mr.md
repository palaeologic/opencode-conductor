---
description: Update MERGE_REQUEST.md using git facts and branch context
subtask: true
---

Update the current branch `MERGE_REQUEST.md` for project key `$ARGUMENTS`.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Goal

Keep `MERGE_REQUEST.md` current by merging:
- objective git facts (diff scope, changed areas, verification state)
- branch context (`LOG.md`, optional `REVIEW.md`, optional `PHASES.md`, optional `MR.md`)
- existing hand-curated MR narrative

without overwriting human-authored intent sections.

## OpenCode headings (preferred machine targets)

**OpenCode heading** — any `##` line whose title starts with **`OpenCode:`** (e.g. `## OpenCode: review status`). **Refresh content only inside these sections** for automated updates. They are safe merge targets.

**Legacy operational headings** (no `OpenCode:` prefix) — older kit names: `## Scope status`, `## Files/areas touched`, `## Verification status`, `## Risks and reviewer focus`, `## Next steps`. **Deprecation:** teams should migrate content into the `OpenCode:` sections in [templates/mr/MERGE_REQUEST.md](templates/mr/MERGE_REQUEST.md). Until then, if a legacy heading **exists verbatim** in the file, you may refresh it **in addition to** OpenCode blocks; if absent, do not create legacy sections.

## Protected narrative (never overwrite body text)

Preserve all human-authored sections. For the stock template, treat everything from **`## Branch`** through **`## Notes`** (inclusive) and any content **before** the first `## OpenCode:` as protected — edit only inside `## OpenCode:` blocks unless the user chose full regenerate with explicit preserve list.

Also preserve if present (alternate MR shapes): `## Context`, `## Goals`, `## Deliverables`, `## Open questions`.

## Procedure

1. Resolve branch and descriptor.
2. Run refresh context (tool path or manual fallback) to get:
   - branch, checkpoint/head, changed areas/files, recommendations.
3. Read branch files from `branches/<branch-name>/`:
   - `MERGE_REQUEST.md` (required target)
   - `LOG.md` (latest entries)
   - `REVIEW.md` if present
   - `PHASES.md` if present
   - `MR.md` if present
4. Compute a concise git summary since checkpoint/merge-base:
   - changed files count and primary areas
   - notable adds/deletes/renames
5. Ask user whether to:
   - **A) Update in place (safe merge)**
   - **B) Append an update section only**
   - **C) Regenerate full MR draft (preserve protected sections)**
6. Update `MERGE_REQUEST.md` according to user choice:
   - **Primary (always target when present or when using stock template):**
     - `## OpenCode: review status` — refresh with git summary, areas touched, checkpoint range, optional next steps from `LOG.md` / recommendations. **If the heading is missing**, insert it **after** the last protected narrative section (typically after `## Notes`) and before other `OpenCode:` blocks; do not duplicate.
     - `## OpenCode: open findings (from REVIEW.md)` — when `REVIEW.md` contains `## Review findings / questions` and/or triage by `F-xx`, summarize **still-open** vs **resolved** items here for MR readers. If `REVIEW.md` is missing, set a one-line placeholder. **If the heading is missing**, create it after `## OpenCode: review status`.
   - **Legacy (optional, transitional):** If any of these headings exist **exactly**, refresh their bodies from the same facts; otherwise **omit** (do not add new legacy sections):
     - `## Scope status`
     - `## Files/areas touched`
     - `## Verification status`
     - `## Risks and reviewer focus`
     - `## Next steps`
   - **Never** inject automated git/findings prose into unstructured author checklists, `## Goal` body, or narrative outside OpenCode (and outside legacy ops headings listed above).
7. Write updated file and report path.

## Promotion from `REVIEW.md`

When `REVIEW.md` includes `## Review findings / questions` and/or `### Triage checklist (by Id)`:
- Populate or refresh **`## OpenCode: open findings (from REVIEW.md)`** with a compact list: open `F-xx` items, severity, one-line question; optionally separate “Resolved since last update”.
- Do not copy the entire `REVIEW.md` into the MR; keep the block scannable.

## Output format (MUST use exactly)

```markdown
## MR update result
- project_key: <projectKey>
- branch: <branch-name>
- mode: <in_place|append_only|regenerate_with_preserve>
- path: <full path to MERGE_REQUEST.md>
- sections_updated:
  - <section 1>
  - <section 2>
  - ...
```

After the structured block, show the updated MR content inline.

## Constraints

- Do not execute tests or code changes.
- Prefer merging over destructive rewrite.
- If `MERGE_REQUEST.md` is missing, create from template first, then update.
- Keep updates deterministic and grounded in branch files + git facts.
- Prefer **`## OpenCode:`** headings for all new automated MR content.
