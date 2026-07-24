---
description: Generate or preserve-update a lean review artifact for the current branch
subtask: true
---

Loads skills (when available): `review-branch` (Senior Reviewer lens), `discover-knowledge` (Senior Architect lens, used by the report-only knowledge preflight).

Generate or preserve-update a lean merge-request-style review artifact for the current project. Default output is concise and findings-first; full checklist / diff output is opt-in.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Argument flags

`$ARGUMENTS` may include:

- `no-preflight` - skip knowledge preflight.
- `no-mermaid` - skip architecture mermaid prompt.
- `mode-hint-only` - do not generate/update `REVIEW.md`; return only a structured mode recommendation for demos.
- `full` - request **Full checklist + diff** without asking for artifact shape.
- `diff-only` - request **Diff-first review** without asking for artifact shape.
- `append-statistics` - include `## Appendix: change statistics`; otherwise statistics are omitted.

## Finding ids

Use strict three-digit ids for new findings. Preserve legacy `F-xx` ids when updating an existing artifact; do not renumber them or allocate new ids in that format.

| Prefix | Meaning | Use for |
| ------ | ------- | ------- |
| `F###` | Fix | Bug, failure point, correctness/security issue, or missing test that blocks confidence. |
| `R###` | Refinement | DRY/KISS improvement, simplification, discrepancy, inefficient or fragile code. |
| `M###` | Misalignment | Misalignment with applicable `AGENTS.md` or `KNOWLEDGE.md` rules. |

Number each prefix independently from `001` upward. Example order in one review: `F001`, `R001`, `M001`, `F002`.

## Review artifact types

Default to **Lean findings** unless `full` or `diff-only` is present, or the user explicitly asks for another shape.

| Plain name | What `REVIEW.md` contains |
| ---------- | ------------------------- |
| **Lean findings** | Scope, preflight summary, findings table, suggested verification, optional notes. This is the default and recommended shape. |
| **Diff-first review** | Lean summary plus per-area diff tables. Use for broad mechanical changes where file coverage matters. |
| **Full checklist + diff** | Lean findings plus review checklist, scenario verification, risks/focus, and diff summary. Use only when a large/shared review needs a durable walkthrough. |

## Procedure

1. Run refresh internally (call `opencode_refresh_context` or manual refresh steps) to gather: branch, changed_areas, changed_files, helper state, risks from Progress log (`LOG.md`) when present, MR acceptance criteria from Merge request context (`MERGE_REQUEST.md`) when present, optional Phase plan (`PHASES.md`), existing Review notes (`REVIEW.md`) if present, and any refresh-provided review state fields.

2. Apply descriptor review filters before review analysis:
   - Read optional `descriptor.reviewIgnoredPathGlobs` as an array of git-style globs.
   - Filter `changed_files` into `reviewed_files` and `ignored_review_files`.
   - Do not generate findings or diff-table rows from ignored files.
   - Still list ignored files in `## Scope` as `ignored_by_review_filter` with count and paths (truncate after 20 paths with a count of the remainder).
   - If the descriptor field is absent or empty, review all changed files.

3. Determine **review lifecycle state** from branch-local `REVIEW.md`. Treat `REVIEW.md` as the source of truth for review state; use `LOG.md` as audit/orientation only.

   1. Resolve the review path as `<expanded branchHandoff.contextDirTemplate>/REVIEW.md`.
   2. If the file exists, read it before generation and parse this optional metadata comment:

      ```markdown
      <!-- OpenCode: review metadata
      reviewed_window: <base-or-checkpoint>..<head>
      reviewed_head: <head-sha>
      branch: <branch-name>
      artifact_type: <lean_findings|diff_first|full_checklist_diff>
      findings_merge_mode: <new|preserve|replace>
      generated_at: <iso-8601>
      review_focus: <none|short summary>
      -->
      ```

   3. Classify state:
      - `new_review` - no `REVIEW.md` exists; create a new artifact.
      - `existing_current` - metadata `reviewed_head` equals current `HEAD`; preserve existing findings and continue triage by default. Only regenerate if the user asked for a refresh or replacement.
      - `existing_head_moved` - metadata `reviewed_head` exists but differs from current `HEAD`; default to **preserve** existing findings/triage and append only new findings for new risk.
      - `existing_unknown_head` - `REVIEW.md` exists but metadata is absent or incomplete; default to **preserve** existing findings/triage and add metadata on write.
   4. If an existing file contains legacy `F-xx` ids, preserve their rows and triage entries exactly. Allocate new findings from the `F/R/M###` namespaces and report that both formats remain present.
   5. If replacement is explicitly requested, set merge mode `replace`. Otherwise set `new` for `new_review` and `preserve` for every existing-state path.

4. **Knowledge preflight (silent, report-only default).** Run before artifact-shape prompts unless `no-preflight` is present. Goal: ensure the review sees relevant area `AGENTS.md` and leaf `KNOWLEDGE.md` status without creating files.

   **Knowledge-drift sub-step (Git-tracked knowledge only):**

   - Resolve base: `git symbolic-ref refs/remotes/origin/HEAD` -> `main` -> `master`. Strip the `refs/remotes/origin/` prefix.
   - `git fetch origin <base>` read-only; skip if you already fetched this base earlier in the current conversation.
   - Compute the drift set: let `MERGE_POINT = git merge-base HEAD origin/<base>`; for every `AGENTS.md` or `KNOWLEDGE.md` reachable from either `MERGE_POINT` or `origin/<base>`, compare blob ids and collect the differing paths.
   - Do not infer Git tracking from `conductorStateLocation`. Only paths represented by Git blobs in the compared refs can drift; global or ignored/untracked files naturally contribute no paths.
   - The drift sub-step is silent on no drift.

   **Leaf-status sub-step:**

   1. From `reviewed_files`, load `pseudoPackageDetection` from the descriptor and normalize:
      - Object form (legacy v1): wrap in a single-element array.
      - Reject any rule missing `area`.
      - Skip rules whose `pathPattern` lacks `{packageName}` (area-only documentation).
   2. Apply detection rules to map each reviewed file to a `(area, packageName)` pair. Disambiguation: longest matching stem wins; ties break by descriptor array order. Files that do not map are ignored.
   3. For each unique detected leaf, resolve the expected leaf knowledge file:
      - If `trackedKnowledgeTargets.sharedPackageKnowledge[packageName]` is defined, use that override path only when it targets a `KNOWLEDGE.md` file. If the override is a legacy `AGENTS.md` path and a sibling `KNOWLEDGE.md` exists, prefer the sibling `KNOWLEDGE.md`; if only the legacy `AGENTS.md` exists, classify it as `existing`; if neither exists, classify it as `skipped` with reason `legacy_agents_override`.
      - Otherwise use the convention path `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md`, where `<rel>` mirrors the leaf's path under `projectRootPath` per the stem derivation contract. Also compute the legacy fallback path `<opencodeProjectRootPath>/<rel>/AGENTS.md`.
   4. Apply safety guardrails for candidate paths:
      - Reject leaf names not matching `^[A-Za-z0-9_][A-Za-z0-9_-]*$` (`invalid_package_name`).
      - Verify root containment under `opencodeProjectRootPath` (`path_outside_root`).
      - Refuse project-root or top-layer `KNOWLEDGE.md` targets (`top_layer_refused`) and any candidate `AGENTS.md` write target (`legacy_agents_override`).
      - `lstat` the target; if it is a symlink, classify as `skipped` with `symlink_refused`.
   5. Classify each leaf:
      - `existing` - canonical `KNOWLEDGE.md` present, or legacy fallback `AGENTS.md` present when no canonical file exists.
      - `missing` - neither canonical nor legacy file exists; do **not** create it during review.
      - `stale` - file exists and the deterministic git-based stale heuristic below is true.
      - `skipped` - guardrail tripped; record reason.
   6. Add existing convention-path leaf files to the review's reread list so generation can use them. Do not add missing files.
   7. Emit `## Preflight summary` in `REVIEW.md` when preflight ran:

      ```markdown
      ## Preflight summary
      - existing: <count>
      - missing: [<area>/<pkg> -> <path>, ...]
      - stale: [<area>/<pkg>, ...]
      - skipped: [<area>/<pkg> - <reason>, ...]
      - drift_vs_base: [<path/to/AGENTS.md or KNOWLEDGE.md>, ...]
      ```

      Omit empty list lines except `existing`. Omit the whole section only when `no-preflight` is present.
   8. Convert preflight concerns to `M###` findings:
      - `missing`: "Knowledge missing for `<area>/<package>`"; suggested action `/scaffold-knowledge <projectKey>` or `/project-knowledge-refresh <projectKey>`.
      - `stale`: "Knowledge stale for `<area>/<package>`"; suggested action `/project-knowledge-refresh <projectKey>`.
      - `skipped`: "Preflight skipped `<area>/<package>` - `<reason>`"; severity `Note`.
      - `drift_vs_base`: "Knowledge drift vs base: <count> file(s)"; suggested action `Rebase onto origin/<base>, or git checkout origin/<base> -- <path>; then re-run /project-review`.

   **Stale heuristic (deterministic):** A leaf's resolved knowledge file is stale when ALL are true:

   - There is at least one commit since `git merge-base HEAD origin/<resolved-base>` whose changed files include the leaf path (`api/<pkg>/...` or equivalent). Resolve `<resolved-base>` with the same `origin/HEAD` → descriptor `baselineBranchForMaterialChanges` → `main` → `master` order used by `git-safety`.
   - For in-repo knowledge files: there is no commit since that merge-base whose changed files include the resolved leaf `KNOWLEDGE.md` (or legacy fallback `AGENTS.md`).
   - For project-local / global knowledge files outside the repo: the file has frontmatter `last_reviewed_commit`, and there are source changes after that commit. If `last_reviewed_commit` is missing or `unknown`, classify as stale when the churn threshold below is met.
   - Churn under the leaf since merge-base is `>= 5` changed files OR includes a high-signal sub-path (`gql/`, `models.py`, `migrations/`, `schema.*`, `index.{ts,tsx,js}`, or any file matched by `descriptor.refreshToolHeuristics.highSignalChangedSubstrings`).

   Do not use `mtime`; it is unreliable across `git checkout`, IDE saves, and editor scaffolds.

5. Ask for **review focus / additional context** only when the user has not already supplied it in the prompt or MR text:
   - If `MERGE_REQUEST.md` has non-placeholder acceptance criteria, ask: `I found MR acceptance criteria. Any extra review focus beyond those, or should I review against the MR as written? Say "none" to use MR + LOG + diff only.`
   - Otherwise ask: `Any specific review focus or extra context? Examples: security, migration safety, tests, performance, UX, API compatibility. Say "none" to use MR + LOG + diff only.`
   - Store a non-empty answer under `## Notes for reviewer`.
   - Also summarize it in metadata as `review_focus`.
   - Use the focus to bias prioritization, but still report serious correctness, security, or data-loss risks outside that focus.
   - If interaction is unavailable, set `additional_context: none` and `review_focus: none`.

6. Preserve/merge existing review content when merge mode is `preserve`:
   - Preserve existing `F###` / `R###` / `M###` rows and triage checklist lines.
   - Normalize triage checklist checkbox markers without changing human-authored state tokens.
   - Append only new findings, allocating ids by scanning existing ids per prefix.
   - Do not delete resolved findings unless the user explicitly chose replacement.

7. Choose artifact type:
   - If `full` is present, generate **Full checklist + diff**.
   - If `diff-only` is present, generate **Diff-first review**.
   - Otherwise use **Lean findings** without asking, unless the user's prompt explicitly asks for a full or diff-first artifact.

8. Mermaid prompt (opt-in):
   - Default: OFF. Prompt only when structural change is detected: multi-area diff (>=3 areas), schema/route changes (`*.graphql`, `migrations/`, `routes.*`, `schema.*`, `urls.py`), or files matching `descriptor.refreshToolHeuristics.highSignalChangedSubstrings`.
   - Recommendation in prompt: "Include for migrations, multi-service refactors, schema changes."
   - Honor `no-mermaid` to skip the prompt entirely.
   - Record the choice as an HTML comment immediately above the `## Architecture` section (or omit the section): `<!-- mermaid: included on user opt-in -->` or `<!-- mermaid: skipped -->`.
   - Never place mermaid inside `## Review findings`, `## Suggested verification`, or any `## OpenCode:` block.

9. Generate the chosen artifact from actual branch state, `reviewed_files`, preflight results, MR acceptance criteria, `LOG.md` risks, existing `REVIEW.md` triage, and review focus/additional context. Do not generate findings from ignored files.

10. Write Review notes (`REVIEW.md`) under `branchHandoff.contextDirTemplate` using the descriptor helper with role `review` (default global example: `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/REVIEW.md`). Put the `OpenCode: review metadata` comment at the top of the file, immediately before `## Scope`, with current `reviewed_head`, `reviewed_window`, `artifact_type`, `findings_merge_mode`, `generated_at`, and `review_focus`. Create or update the branch helper manifest entry for `review` with `state: present`; do not create unrelated helper files.

11. Append a compact audit entry to Progress log (`LOG.md`) only when that helper exists and is writable:
    - Include `reviewed_window`, `reviewed_head`, `review_state`, `artifact_type`, `findings_merge_mode`, findings counts, and open finding ids.
    - Do not use the log entry as canonical review state; it is an audit trail only.
    - If `LOG.md` is unavailable or the command is running in lite mode, skip the audit and set `log_audit_appended: no`.

12. Suggest verification commands the user may want to run (do NOT execute them), using deterministic synthesis:
    - For each changed area with at least one reviewed file, read the area-level `AGENTS.md` and look for `## Verification scripts` table rows matching the schema in [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) (`Trigger | Command | When`).
    - Match each row's `Trigger` against `reviewed_files` in the review window.
    - Support the qualifier `(added or modified)` exactly as documented in the schema.
    - Dedupe commands preserving first-seen order.
    - If a changed area lacks a `## Verification scripts` block, emit one `M###` finding with severity `Note`: "Missing verification scripts block in `<area>/AGENTS.md`", suggested action "add the block manually in the project-owned area rules, using `project-rules/<projectKey>/<area>/AGENTS.md` as the template source when available."
    - If no structured rows match, fall back to generic suggestions (`/check-types`, `/run-tests`, `/lint-fix`).

13. Mode hint dry-run:
    - If `mode-hint-only` is present, skip artifact writes and return:
      - `recommended_mode_next: build` when findings are bounded and implementation changes are straightforward.
      - `recommended_mode_next: plan` when findings indicate unresolved architectural or cross-area decisions.
    - Include one `why:` line.

## Output format (MUST use exactly)

```markdown
## Review artifact generated
- project_key: <projectKey>
- branch: <branch-name>
- artifact_type: <lean_findings|diff_first|full_checklist_diff>
- review_state: <new_review|existing_current|existing_head_moved|existing_unknown_head>
- reviewed_head: <sha|unknown>
- head_has_moved_since_review: <true|false|unknown>
- review_filter:
  - reviewed_files: <N>
  - ignored_files: <N>
- append_statistics: <yes|no>
- additional_context: <none|included>
- findings_merge_mode: <new|preserve|replace>
- log_audit_appended: <yes|no>
- findings_count:
  - F: <N>
  - R: <N>
  - M: <N>
- path: <full path to REVIEW.md>
- suggested_verifications:
  - <command 1>
  - <command 2>
```

After the structured block, show only:

- the `REVIEW.md` path,
- the findings table,
- suggested verifications,
- and the ignored-file count/list if any.

Do not display the full generated `REVIEW.md` inline by default.

## Lean findings section order

Default `REVIEW.md` order:

1. `## Scope`
   - branch and base
   - changed areas
   - reviewed file count
   - `ignored_by_review_filter` count and paths when applicable
   - one-line review focus
2. `## Preflight summary` (only when preflight ran)
3. `## Review findings`
4. `## Suggested verification`
5. `## Notes for reviewer` (only when user supplied additional context)
6. `## Architecture` (only when mermaid was explicitly included)
7. `## Appendix: change statistics` (only with `append-statistics`)

Place the `<!-- OpenCode: review metadata ... -->` comment before `## Scope`; it is not a rendered section.

### Review findings format

Use a pipe table:

| Id | Severity | Triage | Area | File | Finding | Suggested action |
| -- | -------- | ------ | ---- | ---- | ------- | ---------------- |
| F001 | High | open | api | api/foo.py | Boundary case can fail when input is empty. | Add guard and regression test. |
| R001 | Low | open | front-end | front-end/app/src/foo.tsx | Duplicate mapping logic makes later changes fragile. | Extract a small helper only if both call sites stay. |
| M001 | Note | open | api | api/AGENTS.md | Missing verification scripts block. | Add `## Verification scripts`. |

Severity: `Blocker` | `High` | `Medium` | `Low` | `Note`.
Triage starts as `open`; humans may change to `valid` | `invalid` | `fixed` | `wontfix` | `followup`.

Then include:

```markdown
### Triage checklist (by Id)

- [ ] F001 - open
- [ ] R001 - open
- [ ] M001 - open
```

Normalization rules:

- Required line format is `- [ ] X### - <state>` for open or `- [x] X### - <state>` for triaged, where `X` is `F`, `R`, or `M`.
- If a human edit drops the checkbox marker, restore it during merge/preserve normalization.
- Do not change the user-authored state token when normalizing; only restore/normalize the checkbox prefix.
- Mark checkbox `- [ ]` when state is `open`; mark `- [x]` when state is anything else.
- Never delete existing triage lines during preserve/merge; only append new ids.
- Cap findings at 25 rows total for lean output. Overflow becomes one `R###` row: "Additional lower-signal concerns exist; use `full` or `diff-only` for broader diff review."

## Full checklist + diff opt-in

When generating **Full checklist + diff**, include the lean sections first, then add:

- `## Review checklist` with MR acceptance criteria and in-scope reviewer checks.
- `## How to verify` with scenario-style frontend/backend steps when applicable.
- `## Risks and cross-area concerns` with short bullets that reference finding ids.
- `## Focus for review` with the highest-value paths, not an exhaustive file list.
- `## Diff summary` with per-area tables for reviewed files only.

Do not repeat verification after the diff block.

## Diff-first format

When generating **Diff-first review**, use:

1. `## Scope`
2. `## Preflight summary` (when preflight ran)
3. `## Review findings`
4. `## Diff summary`
5. `## Suggested verification`
6. optional `## Notes for reviewer`
7. optional `## Appendix: change statistics`

Group diff rows by area:

```markdown
### <area-name> (N reviewed files changed)

| File | Change type | Reviewer question |
| ---- | ----------- | ----------------- |
| path/to/file | added/modified/deleted | What should the reviewer check? |

Key concern: <area-specific risk or note>
```

## Constraints

- Read-only for source: NEVER run tests, make code changes, or execute verification commands.
- Branch-local: `REVIEW.md` lives in the branch context folder only; the only other allowed write is the compact review audit entry in branch-local `LOG.md`.
- Helper-local: update `HELPERS.json` for the review helper when creating or updating Review notes. Do not create Merge request context, Progress log, or Phase plan as a side effect.
- Non-destructive: if `REVIEW.md` already exists, preserve findings and triage by default; replace only when explicitly requested.
- Deterministic: base content on actual git diff, descriptor filters, branch files, and applicable knowledge.
- Report-only preflight: `/project-review` must never create or update `KNOWLEDGE.md` or `AGENTS.md`.

## Manual fallback

When tools are unavailable:

1. Resolve branch and branch context folder manually.
2. Read descriptor, `MERGE_REQUEST.md`, `LOG.md`, existing `REVIEW.md`, and run `git diff --name-only` plus `git diff --stat` against baseline.
3. Apply `reviewIgnoredPathGlobs` manually to split reviewed vs ignored files.
4. Run the report-only knowledge preflight from this command.
5. Classify review lifecycle state from the metadata comment when present.
6. Ask once for missing review focus/additional context.
7. Generate and write the chosen artifact to the branch folder.
8. Append the compact `LOG.md` review audit entry when tracked context is writable.
