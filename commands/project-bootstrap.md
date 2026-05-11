---
description: Generic branch bootstrap via descriptor-driven tool
subtask: true
---

When the user opts into phased delivery, load skill `plan-phases` (when available) for the Senior Architect / PM lens before drafting `PHASES.md`.

## Project key resolution

If `$ARGUMENTS` is provided (strip flags first if any), use the first token as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use the resolved `<projectKey>` in all tool calls and summaries below** (not the raw `$ARGUMENTS` string if it contained extra tokens).

## Workflow

1. **Resolve `projectKey`** per the section above. Remember `<projectKey>` for the rest of this command.
2. Ask the user exactly this yes/no question before bootstrapping:
   - `Do you want phased delivery for this branch?`
   - Allowed answers: `yes` or `no`
   - If unclear, ask again until answer is clearly `yes` or `no`
3. Call `opencode_bootstrap_branch` with:
   - `projectKey: <projectKey>` (the resolved key from step 1)
   - `includePhases: true` when answer is `yes`
   - `includePhases: false` when answer is `no`
4. Parse the tool response (JSON string) and verify:
   - `applicable === true` (otherwise stop and report `reason`)
5. If applicable, read:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path` (if present)
6. Offer the **first-time paste-ingest** affordance (the same paste flow is available later via `/project-update-mr <projectKey>` scope D or `/project-review-sync <projectKey>` scope D):
   - Ask exactly: `Do you want to paste MR/issue/testing context to auto-fill MERGE_REQUEST.md narrative sections? (yes/no)`
   - If `yes`, ask them to paste the full semi-structured text.
   - If `no`, tell the user: "If you skip paste now, run `/project-update-mr <key>` or `/project-review-sync <key>` later and choose option D to ingest the description."
7. If context was pasted, normalize it into **protected narrative** sections in `MERGE_REQUEST.md`:
   - Parse common labels case-insensitively: `Issue`, `MR`, `Pod URL`, `Stakeholders`, `Description`, `Proposal`, `Acceptance criteria`, `Blocked by`, `Instructions for testing`, `Testing instructions / Focus`, `Desired feedback`, `Feedback`.
   - Merge into narrative sections only (before any `## OpenCode:` heading):
     - URLs (`Issue`, `MR`, `Pod`, review links) -> `## External links` bullets.
     - `Stakeholders` -> `## Stakeholders` bullets.
     - `Description` -> `## Goal` concise 1-3 sentence summary; preserve fuller wording in `## Notes`.
     - `Proposal` -> `## In scope` bullets.
     - `Acceptance criteria` -> `## Acceptance criteria` checkboxes.
     - `Blocked by` -> `## Constraints` blocker bullet (skip when value is effectively none, e.g. `Nada`).
     - Testing instructions / focus / review pod -> `## Verification target` URL + scenario bullets.
     - Feedback request text -> `## Feedback requested` bullets (or `## Notes` when section absent).
   - Never write machine status into narrative; keep all automated status under canonical `## OpenCode:` headings.
8. Protect human-authored narrative:
   - Replace placeholder/default template text.
   - Do not overwrite non-placeholder narrative text unless user explicitly approves.
   - Keep `## OpenCode:` sections untouched during this ingest step.
9. **Inline phases drafting (when phased delivery was yes).** Only if step 2 was `yes` (`includePhases: true`):
   - Read `phases_context_path` and `mr_context_path`.
   - If `PHASES.md` **already contains substantive non-template content** (real phase titles, checked items, or narrative beyond placeholders), **skip** this sub-step and tell the user: `PHASES.md already has content — run /project-phases <projectKey> to refine.`
   - Else if `MERGE_REQUEST.md` narrative sections `## Goal`, `## In scope`, and `## Acceptance criteria` are **still largely template/placeholder** after steps 7–8, **skip** inline drafting; tell the user to enrich the MR (paste or edit) then run `/project-phases <projectKey>`.
   - Else (MR narrative is usable and PHASES is empty/template-heavy):
     - Ask: `Draft PHASES.md now from MERGE_REQUEST.md and git diff vs baseline (recommended)? (yes/later)` — **default/recommend yes** to avoid a second context-gathering pass.
     - If **later**: skip to step 11; user can run `/project-phases <projectKey>` when ready.
     - If **yes**: Load skill `plan-phases` and draft `PHASES.md` **in the same session** using the **same evidence order** as `/project-phases` **AI draft** mode (see [`project-phases.md`](./project-phases.md)): prioritize **`MERGE_REQUEST.md`**, **`LOG.md`**, **git diff / stat vs `baselineBranchForMaterialChanges`**, changed paths from descriptor/refresh context — treat **commit subjects as weak** when history is squash-heavy or `wip`-heavy. Apply mermaid policy (default ON when phases > 3) per [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md). **Do not** ask the user to re-paste MR/issue text already ingested above.
     - **Implementation note:** You may call `opencode_bootstrap_branch` again at the start of drafting if you follow `/project-phases` step 1; it is idempotent and will not overwrite existing MR/LOG/PHASES files.
10. Return a short summary:
   - branch name
   - what was created/seeded (from `created`)
   - file paths for MR/LOG/optional PHASES
   - whether phased delivery is enabled
   - whether pasted context was ingested
   - whether `PHASES.md` was drafted inline or deferred

Constraints:
- Do not overwrite existing branch context files (tool enforces this).
