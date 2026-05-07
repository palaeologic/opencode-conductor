---
description: Generate a review artifact for the current branch
subtask: true
---

Generate a review artifact for the current project.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Review artifact types (plain names; internal letters in parentheses)

Ask the user in **plain language** first; you may show the letter as a shorthand after the name.

| Plain name | Letter | What `REVIEW.md` contains |
|------------|--------|-------------------------|
| **Checklist review** | A | Executive summary, **findings table**, review checklist, how to verify, risks, focus — **no** per-file diff tables. |
| **Diff-first review** | B | Short executive summary + **per-area diff tables** (file / change type / reviewer question). Lighter checklist. |
| **Checklist + diff (full)** | C | Same narrative sections as **Checklist review**, then one **`## Diff summary`** with the **B**-style tables. **Recommend this** for shared or senior review when the branch is non-trivial. |

## Procedure

1. Run refresh internally (call `opencode_refresh_context` or manual refresh steps) to gather: branch, changed_areas, changed_files, risks from `LOG.md`, MR acceptance criteria from `MERGE_REQUEST.md`.
2. **If `REVIEW.md` already exists** in the branch folder:
   - Ask whether to **replace the entire file** or **merge into the existing file** (merge is safer when humans edited triage).
   - If merging or partially regenerating: ask **findings merge mode**:
     - **`preserve` (default)** — keep all existing `## Review findings / questions` table rows and `### Triage checklist (by Id)` lines unchanged unless you are **appending** new findings. Scan existing `F-xx` ids in the file; let `N` be the highest numeric `xx`. New findings get ids `F-(N+01)`, `F-(N+02)`, … (two-digit zero padding). **Never reuse** an existing `F-xx`. Cap **new** rows at 25 per pass; if more risks exist, add one row pointing readers to `## Diff summary` / appendix.
     - **`replace`** — regenerate the findings table from scratch. **Warn:** triage checklists are lost unless the user copied them elsewhere.
3. Ask which artifact type to generate using **plain names** (see table above); default suggestion: **Checklist + diff (C)** for non-trivial branches.
4. Ask whether to include **`## Appendix: change statistics`** (approximate file/churn breakdown and high / medium / low focus tiers). **yes** or **no**.
5. Ask whether to add **additional reviewer context now** (free-text notes from the user, e.g. rollout cautions, known flaky tests, data assumptions, environment caveats). If yes, collect the text and include it in `REVIEW.md` under `## Additional reviewer context`.
6. Generate the chosen artifact based on actual branch state (not generic templates), merging any user-provided additional context and honoring findings merge mode when `REVIEW.md` existed.
7. Write it to the branch context folder as `REVIEW.md` under **`branchHandoff.contextDirTemplate`** (expand `{projectKey}` and `{branchName}`; default global example: `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/REVIEW.md`).
8. Suggest verification commands the user may want to run (do NOT execute them).

## Output format (MUST use exactly)

```
## Review artifact generated
- project_key: <projectKey>
- branch: <branch-name>
- artifact_type: <checklist|diff_summary|both>
- append_statistics: <yes|no>
- additional_context: <none|included>
- findings_merge_mode: <preserve|replace|n/a>
- findings_count: <N or n/a>
- path: <full path to REVIEW.md>
- suggested_verifications:
  - <command 1 — e.g. bun run lint>
  - <command 2 — e.g. python manage.py test --tag=gql>
  - ...
```

After the structured block, display the generated `REVIEW.md` content inline for immediate readability.

## Default `REVIEW.md` section order (Checklist review and Checklist + diff)

When generating a **checklist** (type A) or the checklist portion of **both** (type C), use this order unless the branch is trivially small (then omit empty sections):

1. **`## Executive summary`** — 3–8 bullets: what changed, scale of churn (file count / rough insert-delete totals from `git diff` metadata if available), where the highest risk is. For very large MRs, state clearly when most files look like mechanical churn (e.g. import-only refactors) **only** if justified by diff shape; otherwise use cautious language (**estimated**).
2. **`## Review findings / questions`** — triageable engineering questions and risks (not a duplicate of every MR acceptance checkbox). Prefer **questions / risks / follow-ups**; reference MR acceptance by short title where the finding relates to a specific criterion.
   - **Table** (no checkboxes inside cells; pipe table):

     | Id | Severity | Triage | Area | File | Question | Suggested action |
     |----|----------|--------|------|------|----------|------------------|
     | F-01 | High | open | … | path | … | … |

     **Severity:** `Blocker` \| `High` \| `Medium` \| `Low` \| `Note`. **Triage** column: text token `open` until humans edit (optional: `valid` \| `invalid` \| `fixed` \| `wontfix` \| `followup`).
   - **`### Triage checklist (by Id)`** — one line per finding, markdown checkbox, for humans:

     - [ ] F-01 — open

     **Normalization rules (MUST):**
     - Line format is `- [ ] F-xx — <state>` for open or `- [x] F-xx — <state>` for triaged.
     - Allowed `<state>` tokens: `open` | `valid` | `invalid` | `fixed` | `wontfix` | `followup`.
     - If a human edit drops the checkbox marker (for example `- F-01 — valid`), restore it during merge/preserve normalization (`- [x] F-01 — valid`).
     - Do not change the user-authored `<state>` token when normalizing; only restore/normalize the checkbox prefix.
     - Mark checkbox `- [ ]` when `<state>` is `open`; mark `- [x]` when `<state>` is anything else.
     - Never delete existing triage lines during preserve/merge; only append new ids.

   - **`### Findings legend`** — short definitions for severity levels and triage tokens.
   - **Cap:** at most **25** rows in the table for this section; overflow: single row `F-xx` with Question “Additional mechanical / low-signal changes — see `## Diff summary` or appendix” if type C or appendix requested.
3. **`## Review checklist`** — see **Review checklist body** below.
4. **`## How to verify`** — scenario-style steps; `### Frontend` and/or `### Backend` as applicable. See **How to verify** below.
5. **`## Risks and cross-area concerns`** — prefer short bullets that **reference `F-xx`** where possible; avoid duplicating the full findings table.
6. **`## Focus for review`** — short bullet list of highest-value paths (configs, codegen, migrations, public API/schema, files with large non-mechanical diffs, renames). Not an exhaustive file list.
7. **`## Appendix: change statistics`** — **only** if the user chose **yes** in step 4. Include: totals (`git diff --shortstat` style if available), **heuristic** buckets (many tiny deltas vs few large deltas), top files by churn if helpful, and **high / medium / low** focus tiers. Label numbers as **approximate** when not fully verified. Use `git diff --stat` and optionally `--numstat`; flag paths touching configs, lockfiles, `eslint.config.*`, plugin rule sources, migrations, public GraphQL/schema, etc. as **high signal**.
8. **`## Additional reviewer context`** — **only** if the user chose yes in step 5. Place user-supplied notes verbatim (light formatting only) and do not reinterpret factual claims.

## Type C (“Checklist + diff”)

- Emit sections **1–8** from **Default `REVIEW.md` section order** (omit **7** / **8** when the user chose no appendix / no additional context) **once** in full, as for type A.
- Then add a single **`## Diff summary`** heading and produce the type **B** per-area tables below it.
- **Do not** repeat `## How to verify` after the diff block.

## Review checklist body (type A / start of type C)

For **`## Review checklist`**:

- Use markdown checkboxes (`- [ ]`).
- Include all acceptance criteria from `MERGE_REQUEST.md`.
- Add checkboxes for in-scope items and reviewer checks inferred from other MR sections (`Goal`, `In scope`, `Constraints`, `Notes`, `Verification target`).
- Preserve user-added MR details as explicit checklist items where possible.

## How to verify

- Include **scenario-style** verification steps, not only command names.
- If frontend files changed, add **`### Frontend`** with:
  - Optional first line: **`Base URL (manual):`** \<origin from MR, repo `README`, or `ask author` if unknown\>. Do **not** emit a separate global URL section elsewhere in `REVIEW.md`.
  - Mention a **different E2E / Playwright base URL** only when the MR or repo test config explicitly documents one for this branch; otherwise omit.
  - A short **scenario title** (plain line or `**...**` before steps).
  - A line **`Navigate to: <route or path>`** using values from the MR/diff (app-relative path under the manual dev origin, or full path if that is how the team writes MRs).
  - Numbered, task-oriented UI steps (action + expected outcome), ending with a **regression** bullet for an adjacent flow that must remain unchanged.
- **Illustrative excerpt (follow this structure — not literal product copy; derive real routes from the MR):**

```markdown
**Bulk action on list page**

Base URL (manual): http://localhost:5173

Navigate to: /app/feature/items

1. Select several rows using the row checkboxes.
2. Confirm the bulk-action toolbar appears; choose the primary action (e.g. "Create …").
3. Fill the form, including edge cases; submit.
4. Confirm expected records or UI state for each selected row.
5. Regression: open a single item and use the existing single-item flow; confirm it still behaves as before.
```

- If backend files changed, add **`### Backend`** with: suggested test/API commands (listed only, not executed), status codes, DB or contract expectations.
- If only one area changed, include only that area’s subsection(s).

## Populating findings (preserve vs replace)

- **Sources:** MR `Constraints`, `Notes`, `Verification target`, diff hotspots, `LOG.md` risks, mechanical heuristics (config/schema/migrations/lockfiles).
- **Reserve `F-xx` for** questions, risks, and follow-ups — **not** for every acceptance checkbox (those belong in `## Review checklist`).
- **`preserve`:** read existing table and triage list; **append** new rows only for **new** delta since last review; keep prior rows and triage lines intact.
- **`preserve` normalization:** enforce triage checklist checkbox prefixes as `- [ ]` when state is `open`, or `- [x]` for `valid|invalid|fixed|wontfix|followup`; if a line is plain bullet (no checkbox), restore the marker without changing the state token.
- **`replace`:** rebuild table from current branch state; reset triage checklist lines to `- [ ] F-xx — open` for new ids.

## Diff summary format (type B)

When generating **only** a diff summary (type B), still start with a brief **`## Executive summary`** when the change set is large or high-risk; otherwise one short paragraph is enough.

If the user chose **append_statistics: yes**, add **`## Appendix: change statistics`** after the per-area diff tables, using the same appendix rules as in **Default `REVIEW.md` section order** item 7.
If the user provided additional context, add **`## Additional reviewer context`** after the appendix (or after diff tables when appendix is off).

Group by area:

```markdown
### <area-name> (N files changed)

| File | Change type | Reviewer question |
|------|-------------|-------------------|
| path/to/file | added/modified/deleted | What should the reviewer check? |

Key concern: <area-specific risk or note>
```

## Constraints

- **Read-only**: NEVER run tests, make code changes, or execute verification commands.
- **Branch-local**: `REVIEW.md` lives in the branch context folder only.
- **Non-destructive**: if `REVIEW.md` already exists, ask user whether to overwrite entirely or merge; when merging, honor **findings merge mode**.
- **Deterministic**: base content on actual git diff and branch files, not assumptions.

## Manual fallback

When tools are unavailable:

1. Resolve branch and branch context folder manually.
2. Read `MERGE_REQUEST.md`, `LOG.md`, and run `git diff --stat` against baseline.
3. If `REVIEW.md` exists, read it and ask for file replace vs merge and findings **preserve** vs **replace**.
4. Ask user for artifact type choice (plain names), appendix statistics yes/no, and additional context yes/no (+ collect text if yes).
5. Generate and write `REVIEW.md` to the branch folder.
