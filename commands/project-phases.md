---
description: Create or refine PHASES.md for large branches
subtask: true
---

Loads skill: `plan-phases` (when available) for the Senior Architect / PM lens, phase template, sizing heuristics, and anti-patterns.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Workflow

1. Call `opencode_bootstrap_branch` with:
   - `projectKey: <resolved key>`
   - `includePhases: true`
2. Parse the JSON result.
3. If `applicable` is false, stop and report `reason`.
4. Open/read these branch files:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path`
5. Ask user preferred mode:
   - **AI draft**: draft full phase plan
   - **User-led**: user provides phase text and agent structures it
   - **Hybrid**: user provides notes and agent proposes/iterates
6. If user provides notes/docs, use them as primary source.
7. If `PHASES.md` is newly created:
   - draft initial plan aligned to `MERGE_REQUEST.md` and provided notes
   - use phase+iteration notation when helpful (`1.0`, `1.1`, `1.2`)
   - set a clear active phase
8. If `PHASES.md` already existed:
   - refine only if user asked for updates

8.5. **Mermaid prompt (default ON when phases > 3).** Per the kit-wide mermaid policy in [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) § Mermaid policy, ask whether to include one phase-dependency diagram in `PHASES.md`.

   - **Default:** ON when the draft has **>3 phases**; OFF otherwise.
   - **Recommendation in prompt:** "Include when phases > 3 and dependencies are non-trivial."
   - **Honor `no-mermaid`** in `$ARGUMENTS` (e.g. `/project-phases <projectKey> no-mermaid`) to skip the prompt entirely.
   - **Record the choice** as an HTML comment near the top of `PHASES.md`: `<!-- mermaid: included on user opt-in -->` or `<!-- mermaid: skipped -->`.
   - **Place the diagram** under a single `## Phase dependencies` section near the top, before the per-phase sections; do not duplicate the dependencies in prose.

9. Return:
   - whether `PHASES.md` was newly created (`created.phasesFile`)
   - active phase
   - suggested next phase task
   - whether a phase-dependency diagram was included

