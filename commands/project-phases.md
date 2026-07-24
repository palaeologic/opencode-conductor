---
description: Create or refine PHASES.md for large branches
subtask: true
---

Loads skill: `plan-phases` (when available) for the Senior Architect / PM lens, phase template, sizing heuristics, and anti-patterns.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Argument flags

`$ARGUMENTS` may include:

- `no-mermaid` — skip mermaid prompts.
- `mode-hint-only` — do not draft/update `PHASES.md`; return only a structured mode recommendation for demos.

## Workflow

1. Use `opencode_bootstrap_branch` when the wrapper has been explicitly activated, with:
   - `projectKey: <resolved key>`
   - `helperIds: "phasePlan"`
   Otherwise run the exact **Manual bootstrap fallback** in `/project-bootstrap` with the `phasePlan` helper id.
2. Parse the bootstrap result.
3. If `applicable` is false, stop and report `reason`.
4. Open/read `phases_context_path`. Also read `mr_context_path` and `log_context_path` only when those helpers exist in `existing_helpers`.
5. Resolve seed material before drafting:
   - Inspect the current user request and attachments for local file paths, `@file` mentions, pasted planning text, issue/MR descriptions, or review reports.
   - If local file path(s) are mentioned and readable, ask whether to use them as primary seed material unless the user explicitly said to use them. Recommend yes.
   - If no seed material is detected and `PHASES.md` is newly created, ask once whether the user has a seed document, issue/MR description, or planning note before drafting.
   - Read accepted seed material and use it as the primary source for the north star, phase ordering, completed/open work, risks, rollback gates, and verification.
   - If the user declines, state that the draft will be generic and based only on branch context.
6. Ask user preferred mode:
   - **AI draft**: draft full phase plan
   - **User-led**: user provides phase text and agent structures it
   - **Hybrid**: user provides notes and agent proposes/iterates
7. If user provides notes/docs, use them as primary source.
8. If `PHASES.md` is newly created:
   - draft initial plan aligned to `MERGE_REQUEST.md` when merge request context exists, otherwise use provided notes + git diff
   - use phase+iteration notation when helpful (`1.0`, `1.1`, `1.2`)
   - set a clear active phase
9. If `PHASES.md` already existed:
   - refine only if user asked for updates

9.5. **Mermaid prompt (default ON when phases > 3).** Per the kit-wide mermaid policy in [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) § Mermaid policy, ask whether to include one phase-dependency diagram in `PHASES.md`.

   - **Default:** ON when the draft has **>3 phases**; OFF otherwise.
   - **Recommendation in prompt:** "Include when phases > 3 and dependencies are non-trivial."
   - **Honor `no-mermaid`** in `$ARGUMENTS` (e.g. `/project-phases <projectKey> no-mermaid`) to skip the prompt entirely.
   - **Record the choice** as an HTML comment near the top of `PHASES.md`: `<!-- mermaid: included on user opt-in -->` or `<!-- mermaid: skipped -->`.
   - **Place the diagram** under a single `## Phase dependencies` section near the top, before the per-phase sections; do not duplicate the dependencies in prose.

10. Return:
   - whether Phase plan (`PHASES.md`) was newly created (`created.helpers.phasePlan`)
   - seed material used (`paths` or `none`)
   - active phase
   - suggested next phase task
   - whether a phase-dependency diagram was included

11. **Mode hint dry-run (optional).**
    - If `mode-hint-only` is present, skip file writes and return:
      - `recommended_mode_next: build` when phase plan is stable and implementation-ready.
      - `recommended_mode_next: plan` when dependencies, scope, or risk are still unresolved.
    - Include one `why:` line.
