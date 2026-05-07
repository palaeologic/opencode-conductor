---
description: Generic branch bootstrap via descriptor-driven tool
subtask: true
---

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Workflow

1. Ask the user exactly this yes/no question before bootstrapping:
   - `Do you want phased delivery for this branch?`
   - Allowed answers: `yes` or `no`
   - If unclear, ask again until answer is clearly `yes` or `no`
2. Call `opencode_bootstrap_branch` with:
   - `projectKey: $ARGUMENTS`
   - `includePhases: true` when answer is `yes`
   - `includePhases: false` when answer is `no`
3. Parse the tool response (JSON string) and verify:
   - `applicable === true` (otherwise stop and report `reason`)
4. If applicable, read:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path` (if present)
5. Offer the **first-time paste-ingest** affordance (the same paste flow is available later via `/project-review-sync <projectKey>` scope D):
   - Ask exactly: `Do you want to paste MR/issue/testing context to auto-fill MERGE_REQUEST.md narrative sections? (yes/no)`
   - If `yes`, ask them to paste the full semi-structured text.
   - If `no`, tell the user: "If you skip paste now, run `/project-review-sync <key>` later and choose option D to ingest the description."
6. If context was pasted, normalize it into **protected narrative** sections in `MERGE_REQUEST.md`:
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
7. Protect human-authored narrative:
   - Replace placeholder/default template text.
   - Do not overwrite non-placeholder narrative text unless user explicitly approves.
   - Keep `## OpenCode:` sections untouched during this ingest step.
8. Return a short summary:
   - branch name
   - what was created/seeded (from `created`)
   - file paths for MR/LOG/optional PHASES
   - whether phased delivery is enabled
   - whether pasted context was ingested

Constraints:
- Do not overwrite existing branch context files (tool enforces this).

