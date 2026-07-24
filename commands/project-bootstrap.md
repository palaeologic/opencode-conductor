---
description: Generic descriptor-driven branch bootstrap
subtask: true
---

When the user chooses **Phase plan (`PHASES.md`)**, load skill `plan-phases` (when available) for the Senior Architect / PM lens before drafting or refining that file.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Workflow

0. Do not create project or area `AGENTS.md` during branch bootstrap. Project guidance is an independent installer choice (`--seed-agents <directory>`) and remains project-owned.
1. Ask which branch helper files to create. Use plain-language labels and allow any combination:

   ```text
   Which helper files do you want for this branch?

   - Review notes (REVIEW.md): use this when you want structured findings, triage, and suggested verification for a branch review.
   - Progress log (LOG.md): use this when work may span sessions and you want checkpoints the next agent or teammate can resume from.
   - Phase plan (PHASES.md): use this when the branch is large enough to split into stages with clear exit criteria.
   - Merge request context (MERGE_REQUEST.md): use this when you want a local draft of the MR goal, scope, acceptance criteria, and reviewer notes.

   You can create any combination now and add or remove helper files later with /project-helper.
   ```

   Map selections to descriptor helper ids, commonly `review`, `log`, `phasePlan`, and `mergeRequest`.
2. Use `opencode_bootstrap_branch` when the wrapper has been explicitly activated, with:
   - `projectKey: <resolved projectKey>`
   - `helperIds: "<comma-separated selected helper ids>"`
   Otherwise follow the **Manual bootstrap fallback** below with the same resolved key and helper selection.
3. Parse the bootstrap result and verify:
   - `applicable === true` (otherwise stop and report `reason`)
4. If applicable, read:
   - `helper_manifest_path`
   - helper paths returned under `created.helpers`
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path` (if present)
5. Offer the **first-time seed-ingest** affordance only when **Merge request context (`MERGE_REQUEST.md`)** was selected or already exists. The same paste flow is available later via `/project-update-mr <projectKey>` scope D or `/project-review-sync <projectKey>` scope D:
   - First inspect the current user request and attachments for local file paths, `@file` mentions, pasted planning text, issue/MR descriptions, or review reports.
   - If local path(s) were mentioned, resolve/readability-check them and ask whether to use them to auto-fill `MERGE_REQUEST.md` narrative sections. Recommend yes.
   - If no seed material was detected, ask exactly: `Do you want to paste MR/issue/testing context to auto-fill MERGE_REQUEST.md narrative sections? (yes/no)`
   - If `yes`, ask them to paste the full semi-structured text or provide a readable local path.
   - If `no`, tell the user: "If you skip seed context now, run `/project-update-mr <key>` or `/project-review-sync <key>` later and choose option D to ingest the description."
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
   - helper files created and tracked in `HELPERS.json`
   - whether pasted context was ingested

Constraints:
- Do not overwrite existing branch context files (tool enforces this).
- Do not create unselected helper files.
- If a helper is missing later, tell the user they can create or repair it with `/project-helper`.

## Manual bootstrap fallback

Use this procedure when custom wrappers are unavailable. It is the write-capable counterpart to `/manual-refresh`.

1. Load `<config-root>/projects/<resolved projectKey>/descriptor.json`, verify its `projectKey`, verify the current repository matches `projectRootPath`, and reject a detached or unsafe branch name.
2. Resolve the helper registry from `branchHandoff.helpers`. For schema v1/v2, normalize the fixed merge-request, log, phase-plan, and review filename fields into equivalent helper entries before continuing. Reject unknown selected ids.
3. Expand `branchHandoff.contextDirTemplate` and `templatesDir` with the resolved project key and branch. Resolve `~`, then require both results to be absolute, non-root paths. Every helper filename, template filename, and `helperManifestFilename` must be a safe relative path that remains inside its respective root.
4. Inspect the branch context directory, manifest, every selected helper path, and every selected template before writing anything:
   - Refuse symbolic links, non-regular files, paths that resolve outside their root, helper/manifest filename conflicts, malformed descriptors, and malformed manifests.
   - Preserve an invalid existing manifest and stop with its exact path and error.
   - Existing regular helper files are reusable and must never be overwritten.
   - A missing template is an error when the selected helper declares `templateFilename`.
5. Prepare all missing helper contents in memory before writing. Use the declared template when present; otherwise use `# <filename>`. Replace the declared branch placeholder, and for the log role replace `<commit-sha>`, the initial timestamp heading, and `area:` when those placeholders exist.
6. Create only the missing selected helpers with exclusive-create semantics and mode `0600`. Track exactly which paths this attempt created.
7. Merge selected entries into the existing manifest as:

   ```json
   {
     "schemaVersion": 1,
     "helpers": {
       "<helper-id>": {
         "path": "<safe path relative to the branch context directory>",
         "state": "present",
         "updatedAt": "<ISO-8601 timestamp>",
         "lastSeenAt": "<ISO-8601 timestamp>"
       }
     }
   }
   ```

   Preserve entries for helpers that were not selected. Write the complete manifest to a unique mode-`0600` temporary file in the manifest directory, then atomically replace the manifest. Remove the temporary file on every exit path.
8. If any helper or manifest write fails, remove only helper files created by this attempt. Preserve all pre-existing helpers and the previous manifest.
9. Reconcile descriptor, manifest, and filesystem state and return the same fields used in the normal workflow, including supported/tracked/existing/missing/untracked/unsupported/available/removed helpers, drift, created paths, and role-specific context paths.
