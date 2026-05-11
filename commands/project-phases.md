---
description: Create or refine PHASES.md for large branches
subtask: true
---

Loads skill: `plan-phases` (when available) for the Senior Architect / PM lens, phase template, sizing heuristics, and anti-patterns.

## Project key resolution

If `$ARGUMENTS` is provided, use the first token as `projectKey` (strip flags). Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Use `<resolved projectKey>` in all tool calls below.**

## Argument flags

`$ARGUMENTS` may include:

- `no-mermaid` — skip mermaid prompts.
- `mode-hint-only` — do not draft/update `PHASES.md`; return only a structured mode recommendation for demos.

## Workflow

1. Call `opencode_bootstrap_branch` with:
   - `projectKey: <resolved projectKey>`
   - `includePhases: true`
2. Parse the JSON result.
3. If `applicable` is false, stop and report `reason`.
4. Open/read these branch files:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path`
5. **Drafting mode (conditional).** After reading `MERGE_REQUEST.md`:
   - If `## Goal`, `## In scope`, and `## Acceptance criteria` each contain **non-placeholder, substantive** content (not empty, not only template stubs like "TBD" / lorem / single generic line), then **default to AI draft** sourced from `MERGE_REQUEST.md`, `LOG.md`, and **git evidence** (see step 6). **Announce** to the user: `Using AI draft mode from MERGE_REQUEST.md and git diff (override: say user-led or hybrid).`
   - Otherwise, ask the user to choose explicitly:
     - **AI draft** — agent infers from **`MERGE_REQUEST.md`**, **`LOG.md`**, and **git diff / `--stat` vs `baselineBranchForMaterialChanges`** from the descriptor; **commit log is tertiary** (weak signal when history is squash-heavy or messages are generic/`wip`).
     - **User-led** — user provides phase text and agent structures it.
     - **Hybrid** — user provides notes and agent proposes/iterates.
   - User may override the default in one line (e.g. `hybrid` or `user-led`).
6. **Evidence order (AI draft and default-auto path).** When inferring phases, **do not** rely primarily on `git log` messages when the diff is large vs a small number of commits or when subjects are low-signal. **Prioritize:**
   1. `git diff` / `git diff --stat` (or `--name-status`) **against the descriptor baseline** (`baselineBranchForMaterialChanges`, typically `main`).
   2. `MERGE_REQUEST.md` narrative + `LOG.md`.
   3. Changed paths / areas from prior `/project-refresh` handoff in this session if available.
   4. **`git log --oneline` only as a tie-breaker** when messages are clearly granular and descriptive.
7. If user provides notes/docs in **hybrid** or after choosing **user-led**, use them as primary source.
8. If `PHASES.md` is newly created:
   - draft initial plan aligned to `MERGE_REQUEST.md` and provided notes
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
   - whether `PHASES.md` was newly created (`created.phasesFile`)
   - active phase
   - suggested next phase task
   - whether a phase-dependency diagram was included

11. **Mode hint dry-run (optional).**
    - If `mode-hint-only` is present, skip file writes and return:
      - `recommended_mode_next: build` when phase plan is stable and implementation-ready.
      - `recommended_mode_next: plan` when dependencies, scope, or risk are still unresolved.
    - Include one `why:` line.
