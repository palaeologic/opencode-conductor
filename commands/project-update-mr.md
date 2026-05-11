---
description: Update MERGE_REQUEST.md using git facts and branch context
subtask: true
---

Update the current branch `MERGE_REQUEST.md` for project key `$ARGUMENTS`.

## Scope

This command refreshes canonical `## OpenCode:` blocks and supports append/regenerate MR draft updates. It also supports narrative paste-ingest via option D.

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

## OpenCode headings (canonical machine targets)

Use exact canonical headings for machine-maintained content:
- `## OpenCode: review status`
- `## OpenCode: open findings (from REVIEW.md)`

If older drifted OpenCode headings exist (for example dated update titles, `Review triage summary`, `Git facts`), migrate their machine content into the canonical headings and stop writing to the drifted names.

**Legacy operational headings** (no `OpenCode:` prefix) — older kit names: `## Scope status`, `## Files/areas touched`, `## Verification status`, `## Risks and reviewer focus`, `## Next steps`. **Deprecation:** teams should migrate content into the canonical `OpenCode:` sections in [templates/mr/MERGE_REQUEST.md](templates/mr/MERGE_REQUEST.md). Until then, if a legacy heading **exists verbatim** in the file, you may refresh it **in addition to** canonical OpenCode blocks; if absent, do not create legacy sections.

## Protected narrative (never overwrite body text)

Preserve all human-authored sections. For the stock template, treat everything from **`## Branch`** through **`## Notes`** (inclusive) plus optional narrative sections (`## External links`, `## Stakeholders`, `## Feedback requested`) and any content **before** the first `## OpenCode:` as protected — edit only inside `## OpenCode:` blocks unless the user chose full regenerate with explicit preserve list.

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
4.5. **Default mode hint (after reading MR).** If `## Goal`, `## In scope`, and `## Acceptance criteria` already contain **substantive, non-placeholder** narrative (typical after `/project-bootstrap` paste-ingest or manual authoring), **tell the user before the menu**: `Narrative sections look filled — recommend **A** to refresh ## OpenCode: blocks from git only; use **D** only if you need to ingest or replace pasted MR/issue/testing text.` Still print the full four-option menu below verbatim (do not remove **D**).
5. Ask user whether to:
   - Print the menu **exactly** as the fenced block below, preserving all four lettered options. Do not paraphrase, renumber, omit option **D**, or collapse the choices into prose.

   ```text
   A) Update in place (safe merge)
   B) Append an update section only
   C) Regenerate full MR draft (preserve protected sections)
   D) Ingest pasted MR/issue/testing context into narrative sections (safe merge)
   ```

   Paste-ingest is also available in `/project-review-sync` (scope D); pick whichever command matches your intent.
6. Update `MERGE_REQUEST.md` according to chosen mode(s):
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
7. For mode **D**, ask the user to paste the source text, then parse labels such as `Issue`, `MR`, `Pod URL`, `Stakeholders`, `Description`, `Proposal`, `Acceptance criteria`, `Blocked by`, testing instructions/focus, and feedback request text; merge into narrative sections (`Goal`, `In scope`, `Acceptance criteria`, `Constraints`, `Verification target`, `External links`, `Stakeholders`, `Feedback requested`, `Notes`) without touching machine blocks. Replace placeholder template text; do not overwrite non-placeholder human-authored narrative without explicit approval.

7.5. **Mermaid prompt (opt-in for architectural / migration MRs).** Per the kit-wide mermaid policy in [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) § Mermaid policy, ask whether to include a single mermaid diagram under a narrative `## Architecture` section (in the protected narrative range, never inside an `## OpenCode:` block).

   - **Default:** OFF. Prompt only when the git summary suggests an **architectural / migration** change — heuristics: ≥3 areas changed; presence of `migrations/`, `*.graphql`, `schema.*`, `routes.*`, or files matching `descriptor.refreshToolHeuristics.highSignalChangedSubstrings` in the diff.
   - **Recommendation in prompt:** "Include for migrations, multi-service refactors, schema changes."
   - **Honor `no-mermaid`** in `$ARGUMENTS` (e.g. `/project-update-mr <projectKey> no-mermaid`) to skip the prompt entirely.
   - **Record the choice** as an HTML comment immediately above the `## Architecture` section: `<!-- mermaid: included on user opt-in -->` or `<!-- mermaid: skipped -->`.
   - **Never** place mermaid inside any `## OpenCode:` block (those are agent-machine-readable).

8. Write updated file and report path.

## Promotion from `REVIEW.md`

When `REVIEW.md` includes `## Review findings / questions` and/or `### Triage checklist (by Id)`:
- Populate or refresh **`## OpenCode: open findings (from REVIEW.md)`** with a compact list: open `F-xx` items, severity, one-line question; optionally separate “Resolved since last update”.
- Do not copy the entire `REVIEW.md` into the MR; keep the block scannable.
- If triage checklist lines in `REVIEW.md` are preserved/merged during related review flows, enforce checkbox normalization: `- [ ] F-xx — <state>` for `open`, `- [x] F-xx — <state>` for `valid|invalid|fixed|wontfix|followup`; restore missing checkbox markers (for example `- F-02 — valid` -> `- [x] F-02 — valid`) without changing the state token.

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
