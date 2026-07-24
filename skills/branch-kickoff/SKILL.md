---
name: branch-kickoff
description: Senior Engineer / Architect lens for kicking off a big project on a fresh branch — orchestrates git-safety preflight, knowledge-drift gate, big-project criteria, model selection, mermaid policy, and audit trail; powers `/project-branch-new` and `/project-branch-kickoff`
---

## What I do

Run the shared orchestration logic for kickoff commands so each individual command stays a thin shell of the user-facing flow. I never run git commands myself — I load `skills/git-safety` for that — and I never write knowledge — I delegate to `discover-knowledge` and the `/scaffold-knowledge` command. My job is to gate, prompt, audit, and hand off.

## When to use me

- A command wants to start or scaffold a "big project" branch (`/project-branch-new`, `/project-branch-kickoff`).
- A command needs the kit-standard flow: safety preflight → drift gate → big-project criteria → phases → knowledge → audit.
- A future command wants to add a kickoff variant (e.g. release-branch kickoff) and inherit these defaults.

Do not load me for plain feature work, lint runs, or anything that does not need the multi-phase scaffold. The lighter `/project-bootstrap` + `/scaffold-knowledge` pair is correct for those cases.

## Anti-pattern

Like every kit skill, this one **never loads other skills directly except `git-safety`**, which is treated as a foundational primitive (no further skill loads). The calling command is responsible for loading additional skills (`plan-phases`, `discover-knowledge`) when this skill hands off. Keeps the dependency graph flat and the audit predictable.

## Orchestration steps

Run these in order. Any step that fails or is declined by the user halts the flow with a clear "what to do next" message.

### 1. Load `skills/git-safety`

Run the safety preflight (clean tree, attached HEAD, base resolution) and the stash reminder hook. If the preflight refuses, abort with the remediation hint. Do not proceed to step 2.

### 2. Knowledge drift gate (kickoff-only)

When invoked from `/project-branch-kickoff` (i.e. on an existing branch), run the knowledge-drift preflight against the resolved base from step 1. The check uses the same logic as `/project-knowledge-refresh` and `/project-review` so behavior is consistent across the kit:

- Resolve base via `git symbolic-ref refs/remotes/origin/HEAD` → `main` → `master` (already done in step 1; reuse the cached value).
- `git fetch origin <base>` (read-only).
- Compute the Git-tracked guidance drift set: let `MERGE_POINT = git merge-base HEAD origin/<base>`; for every `AGENTS.md` or `KNOWLEDGE.md` reachable from either `MERGE_POINT` or `origin/<base>`, compare blob ids and collect the differing paths.
- Compare only knowledge paths represented by Git blobs in the two refs. Do not skip solely because state is project-local: committed project-local files can drift, while global or ignored/untracked files naturally contribute no paths.
- **Behavior on drift**:
  - 0 drifted files → silent; proceed.
  - 1–5 drifted files → emit an `M###` finding "Knowledge drift vs base: <count> file(s)" inline in the kickoff banner; recommend rebase but do **not** block; user confirms whether to proceed.
  - >5 drifted files → emit the finding and **block** scaffolding by default, with a single confirm prompt to override. Rationale: scaffolding into a heavily drifted branch produces low-quality knowledge; rebasing first is almost always the right move.
- Suggested action in every case: `Rebase onto origin/<base>, or git checkout origin/<base> -- <path> for a single-file pull-up; then re-run /project-branch-kickoff`.
- Honor `--no-preflight` to bypass entirely. The drift gate does not apply to `/project-branch-new` because the user is not yet on the new branch — drift is computed after the branch is created and on subsequent kickoff.

### 2.5. Seed material gate

Before drafting Phase plan (`PHASES.md`) or Merge request context (`MERGE_REQUEST.md`), resolve seed material per `documentation/PATH_CONTRACT.md` § Seed material for generated artifacts.

- Inspect the current user request and attachments for local file paths, `@file` mentions, pasted planning text, issue/MR descriptions, or review reports.
- If one or more local files are mentioned and readable, ask whether to use them as the primary seed material unless the user explicitly said to use them. Recommend yes.
- If no seed material is detected, ask once whether the user has a seed document, issue/MR description, or planning note before generating the first phase/MR draft.
- Read accepted seed material before the big-project criteria summary and before any phase/MR drafting. Use it as the primary source for scope, phase ordering, completed/open work, risks, verification, and MR narrative.
- The kickoff banner includes `seed_material: <paths|none declined|none unavailable>`.

Generic scaffolds are allowed only when the seed material question was declined, unavailable, or explicitly bypassed by a non-interactive mode.

### 3. Big-project criteria check

Confirm the work qualifies as "big" by asking the user (preselect "yes" if any of the heuristics fire):

- expected to span >2 working days, **or**
- introduces a new pseudo-package or area, **or**
- changes ≥3 areas (api / cli / front-end / etc.), **or**
- migration / breaking change flagged.

If none match, recommend the lighter `/project-bootstrap` + `/scaffold-knowledge` pair instead and stop.

### 4. Model selection

Apply the model policy (see [Model policy](#model-policy)). Resolve the effective model from frontmatter default + user override, log the choice, and surface a fallback warning if the chosen model is unavailable.

### 5. Hand off to helpers + knowledge

The calling command performs the actual work; this skill only documents the contract:

- For `/project-branch-new`: confirm-per-step git ops (`fetch`, `checkout <base>`, `pull --ff-only`, `checkout -b <new>`), then optionally chain into `/project-branch-kickoff`.
- For `/project-branch-kickoff`: run `/project-refresh`, repair `helper_drift` only when the user chooses, create only selected helpers via `/project-bootstrap` or `/project-helper`, then run `/project-knowledge-refresh`; load `skills/plan-phases` when Phase plan is selected; run `/scaffold-knowledge` (Dry-run first by default).

Each handoff is one user confirmation; do not bundle.

### 6. Mermaid policy

Apply the kit-wide mermaid policy (see `documentation/PATH_CONTRACT.md` § Mermaid policy):

- `PHASES.md`: prompt with default ON when phases > 3.
- Merge request context (`MERGE_REQUEST.md`): prompt opt-in for migrations / multi-service refactors / schema changes; skip when the helper is absent.
- Progress log (`LOG.md`): never auto-generate.
- `REVIEW.md`: prompt opt-in, default ON only when structural change is detected (new packages, multi-area diff, schema/route changes).
- All prompts include a one-line recommendation with rationale and preselect the recommended option.
- Honor `--no-mermaid` to skip every prompt.

Record the user's choice as a comment in the produced artifact (e.g. `<!-- mermaid: included on user opt-in -->`) so the decision is auditable.

### 7. Audit trail

Append, in order, only to helpers that already exist or that the user explicitly chose to create:

- A Progress log (`LOG.md`) block of the form:
  ```
  ### Kickoff <ISO timestamp>
  - command: /project-branch-new | /project-branch-kickoff
  - base: <base-branch>
  - new branch: <branch>
  - integration_base: origin/<base> (<merge-base-short>)
  - parent_branch: <remote/branch or none/unknown>
  - branch_delta: <N> commits from integration base
  - working_delta: <N> commits from parent/checkpoint to HEAD
  - reviewed_window: <start-short>..<head-short>
  - model: <selected> (fallback: <fallback or none>)
  - mermaid: phases=<bool> review=<bool> mr=<bool>
  - seed_material: <paths|none declined|none unavailable>
  - confirmations: <list of confirmed steps>
  ```
- An `## OpenCode:` block in Merge request context (`MERGE_REQUEST.md`) with the same metadata, no PII, no raw user prompts; link to the first phase if Phase plan (`PHASES.md`) exists.

For stacked branches, the Progress log summary names both the full `branch_delta` from integration base and the narrower `working_delta` being scaffolded. Do not describe inherited parent-branch commits as new kickoff work.

If Progress log or Merge request context is absent, do not create it silently. Report `audit_log_path: skipped` or `audit_mr_path: skipped` in the host command output. Any audit writes that do occur happen atomically at the end of the flow; do not split metadata across separate writes.

### 8. Next-step recommendation

At the end of kickoff, emit a short suggestion for what the user should do next:

- Recommend proceeding with implementation when kickoff completed (gates passed, phases drafted, discovery done) and the active phase is implementation-ready.
- Recommend further planning when drift or unresolved scope/risk remains.
- Never auto-execute follow-up commands; wait for the user to decide.

## Confirmation discipline

- Every git or file mutation gets a one-line preview followed by an explicit confirm.
- Aggregate confirms are allowed only for read-only sequences (`status`, `fetch --dry-run`, `log`).

## Kickoff confirmation prompts

When the host offers a structured question UI, ask the seed-material decision before drafting. It may be a separate prompt or the first card in the kickoff prompt. The remaining kickoff prompt MAY batch these decisions in one call:

1. `Big-project confirmation`
2. `Mermaid in PHASES.md`
3. `Model for kickoff`

If the seed-material decision is batched with the other cards, order it first and keep the array to at most four cards: `Seed material`, `Big-project confirmation`, `Mermaid in PHASES.md`, `Model for kickoff`.

Pass `questions` as a native array of question objects. Do not pass a JSON-encoded string such as `"[{\"header\":...}]"`; that fails the host schema because `questions` is no longer an array. If the question UI call fails validation, retry with corrected structured arguments before moving on, so the user does not have to infer which decisions were accepted.

Minimal shape:

```json
{
  "questions": [
    {
      "header": "Seed material",
      "question": "Use the mentioned planning document as the primary source for PHASES.md and MERGE_REQUEST.md?",
      "options": [
        {
          "label": "Use seed document (Recommended)",
          "description": "Read the document first and align scope, phases, risks, and MR narrative to it."
        },
        {
          "label": "Continue without it",
          "description": "Generate a generic scaffold from branch/git context only."
        }
      ]
    },
    {
      "header": "Big-project confirmation",
      "question": "[branch-kickoff] ... Confirm scaffolding phases + MR?",
      "options": [
        {
          "label": "Yes, scaffold selected helpers (Recommended)",
          "description": "Create only the chosen helper files, such as Phase plan for planning, Progress log for audit, and Merge request context for local MR notes."
        },
        {
          "label": "No, use lighter bootstrap only",
          "description": "Skip the heavy kickoff scaffold and create only the helper files the user selects."
        }
      ]
    }
  ]
}
```

## Model policy

Default model resolution:

- **Default:** unset. The command frontmatter leaves `model` empty and uses the active session model.
- **Cost-aware profile:** use a balanced route for normal kickoffs, an economy route only for bounded mechanical initialization, and a frontier route when the kickoff spans multiple systems, has unclear requirements, or carries high migration/security risk. The profiles and current examples are maintained in `documentation/MODEL_ROUTING_AND_COST.md`.
- **Optional override prompt** (only when the user asks; preselect default):
  - "Use default (recommended for kickoffs)"
  - "Pick another model" — opens free-form picker
  - "Keep current session model" — no subtask spawn
- **Fallback behavior:** if the chosen model is unavailable, emit a structured warning, document the fallback chain in the command response, and log the fallback in the Progress log audit block only when that helper exists.

## Output format

Each step's outcome is summarized in a structured banner so the user can scan the run:

```
[branch-kickoff]
- safety: ok
- drift: 0 file(s)
- seed_material: <paths|none declined|none unavailable>
- big-project criteria: 2 of 4 matched (multi-area, migration)
- model: <selected> (fallback: none)
- next: /project-bootstrap | /project-knowledge-refresh
```

If any step refuses or is declined, the banner ends with a `STATUS: aborted | declined | refused` line and the command halts.

## Anti-patterns to avoid

- **Auto-spawning subtasks without consent.** Frontmatter sets defaults; runtime overrides require an explicit prompt.
- **Bundling confirmations.** Each mutation gets its own one-line preview; long aggregate confirms hide intent.
- **Writing audit metadata at multiple times.** Audit writes are atomic at the end so a half-finished run is observable as "no audit entry yet".
- **Embedding raw user prompts in audit metadata.** Audit fields are structured (command name, base, branch, model, choices) and never include free-text user messages. See `documentation/PATH_CONTRACT.md` § Security rules.

## Related

- Foundational primitive: `skills/git-safety/SKILL.md`.
- Senior reviewer / architect lens for adjacent flows: `skills/discover-knowledge`, `skills/plan-phases`, `skills/review-branch`.
- Baseline persona: `rules/SENIOR_ENGINEERING.md`.
- Commands wired in this plan: `commands/project-branch-new.md`, `commands/project-branch-kickoff.md`.
- Contract: `documentation/PATH_CONTRACT.md` § Audit trail, § Mermaid policy, § Frontmatter conventions, § Security rules.
