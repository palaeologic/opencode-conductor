---
description: Light MR↔REVIEW sync after MR edits or new commits without a full /project-review regenerate
subtask: true
---

Run a **lightweight** sync when **`MERGE_REQUEST.md` and/or the git branch changed** but you do **not** want a full `REVIEW.md` regeneration from `/project-review`.

## When to use this vs other commands

| Situation | Use |
|-----------|-----|
| Re-run risk analysis, refresh findings from full diff, large narrative rewrite of `REVIEW.md` | `/project-review` |
| Refresh git facts + `OpenCode:` MR blocks from current `REVIEW.md` / `LOG.md` only | `/project-update-mr` |
| MR checklist / acceptance text changed **or** new commits landed; you want optional checklist alignment + append-only `F/R/M###` rows **without** wiping triage | **`/project-review-sync`** (this command) |

This command **does not** replace a deep code review pass; it **merges deltas** and keeps human triage unless the user explicitly opts into destructive steps.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Procedure

1. Run refresh internally (same first step as `/project-review`: `opencode_refresh_context` or manual refresh) to load branch, changed files, helper state, Merge request context (`MERGE_REQUEST.md`) when present, Progress log (`LOG.md`) when present, review lifecycle state, and existing Review notes (`REVIEW.md`) if present.
2. If Review notes (`REVIEW.md`) are missing and the user chose scopes **A** or **B**, explain: "Review notes (`REVIEW.md`) hold findings and triage. Create them with `/project-review` or skip review-note sync for this run." Stop only for scopes that need review notes.
3. Parse existing `OpenCode: review metadata` if present. Preserve it when only MR blocks change. When scope **A** or **B** updates `REVIEW.md`, refresh `reviewed_head`, `reviewed_window`, `generated_at`, and set `findings_merge_mode: preserve`; add metadata if it was missing.
4. Ask the user which **sync scopes** to apply (multi-select ok):
   - Print the menu **exactly** as the fenced block below, preserving all four lettered options. Do not paraphrase, renumber, omit option **D**, or collapse the choices into prose.

   ```text
   A) Merge MR checklist deltas into Review notes (REVIEW.md) ## Review checklist
   B) Optionally append new F/R/M### findings for risks visible in the new diff only
   C) Refresh Merge request context (MERGE_REQUEST.md) only inside ## OpenCode: headings
   D) Ingest pasted MR/issue/testing context into narrative sections (safe merge)
   ```

   **A)** Merge MR checklist deltas into `REVIEW.md` **`## Review checklist`** only when that section exists (full review artifacts). Add/update checkboxes from MR `## Acceptance criteria`, `## In scope`, `## Verification target`; **do not** create a checklist section in lean artifacts unless the user explicitly asks for full-review alignment.
   **B)** Optionally **append** new **`F/R/M###` findings** for risks visible in the new diff only — default **preserve** existing findings table and triage checklist; scan max existing id per prefix before allocating new ids (same rule as `/project-review`). Ask **yes/no** for new findings; default **no** if the change is trivial.
   **C)** Refresh **Merge request context (`MERGE_REQUEST.md`)** only inside **`## OpenCode:`** headings from current `REVIEW.md` triage summary + git facts (same rules as `/project-update-mr` for OpenCode blocks). If the merge request helper is missing, offer to create it with `/project-helper` or skip scope C. Ask **yes/no**; default **yes** when the user asked for MR handoff.
   **D)** Ingest pasted MR/issue/testing context into narrative sections (safe merge) — canonical paste-ingest path. Normalizes pasted GitLab/Jira/Confluence-ish MR text into the protected narrative sections of `MERGE_REQUEST.md` (`## External links`, `## Stakeholders`, `## Goal`, `## In scope`, `## Acceptance criteria`, `## Verification target`, `## Feedback requested`) without touching `## OpenCode:` machine blocks. Ask **yes/no**; default **yes** when the user pasted semi-structured context. **When to choose D:** pick D when `MERGE_REQUEST.md` narrative sections are still placeholder text or need refreshing from an external description (issue tracker, Jira/GitLab MR body, pod review brief, etc.). This same paste-ingest scope is also available in `/project-update-mr` option D when your intent is direct MR-file updating.
5. For scope **D**, ask the user to paste the source text, then parse labels such as `Issue`, `MR`, `Pod URL`, `Stakeholders`, `Description`, `Proposal`, `Acceptance criteria`, `Blocked by`, testing instructions/focus, and feedback request text; merge into narrative sections (`Goal`, `In scope`, `Acceptance criteria`, `Constraints`, `Verification target`, `External links`, `Stakeholders`, `Feedback requested`, `Notes`) without touching machine blocks. Replace placeholder template text; do not overwrite non-placeholder human-authored narrative without explicit approval.
6. Apply chosen scopes. **Never** overwrite protected MR narrative (everything before the first `## OpenCode:` in the stock template, plus `## Branch`-`## Notes` bodies and optional narrative sections). **Never** remove existing `F/R/M###` or legacy `F-xx` triage lines unless the user explicitly asked to replace findings. Preserve legacy ids without renumbering and allocate new findings only from the `F/R/M###` namespaces.
7. When preserving/merging `### Triage checklist (by Id)` lines in `REVIEW.md`, normalize each line to checkbox form:
   - Required line format: `- [ ] X### - <state>` (open) or `- [x] X### - <state>` (triaged), where `X` is `F`, `R`, or `M`.
   - Allowed `<state>` tokens: `open` | `valid` | `invalid` | `fixed` | `wontfix` | `followup`.
   - If a human edit removed the checkbox marker (for example `- R002 - valid`), restore it (`- [x] R002 - valid`).
   - Do not change the user-authored `<state>` token; only normalize the checkbox prefix.
   - Set `- [ ]` when `<state>` is `open`; set `- [x]` when `<state>` is anything else.
   - Never delete triage lines during preserve/merge; only append new ids.
8. For scope **C**, refresh only canonical machine headings in MR:
   - `## OpenCode: review status`
   - `## OpenCode: open findings (from REVIEW.md)`
   If drifted OpenCode headings exist, migrate content into canonical headings and stop writing to drifted names.
9. Write updated files and report paths.

## Output format (MUST use exactly)

```
## Project review sync result
- project_key: <projectKey>
- branch: <branch-name>
- review_state: <existing_current|existing_head_moved|existing_unknown_head>
- reviewed_head: <sha|unknown>
- scopes_applied:
  - <merge_checklist|append_findings|refresh_opencode_mr>
- findings_appended: <count or 0>
- paths_written:
  - <path to REVIEW.md>
  - <path to MERGE_REQUEST.md if updated>
```

After the structured block, show a short diff-style summary of what changed (headings touched, counts).

## Constraints

- **Read-only for repo source**: do not run tests, lint, or change application code.
- **Prefer merge over replace** for `REVIEW.md` body sections.
- If scopes would conflict (e.g. MR removed an acceptance item still checked in `REVIEW.md`), add a bullet under `## Executive summary` or findings noting the conflict instead of silently deleting.
