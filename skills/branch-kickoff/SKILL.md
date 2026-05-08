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
- `git fetch origin <base>` (read-only). Reuse the **5-minute fixed session cache** to avoid repeated fetches when chained with refresh/review in the same session.
- Compute the AGENTS.md drift set: let `MERGE_POINT = git merge-base HEAD origin/<base>`; for every `AGENTS.md` reachable from either `MERGE_POINT` or `origin/<base>`, compare blob ids and collect the differing paths.
- Skip when storage mode is project-local (per `docs/PATH_CONTRACT.md` § Knowledge across branches) — drift cannot be computed against branch state when knowledge is not branch-scoped.
- **Behavior on drift**:
  - 0 drifted files → silent; proceed.
  - 1–5 drifted files → emit a `F-xx` finding "Knowledge drift vs base: <count> file(s)" inline in the kickoff banner; recommend rebase but do **not** block; user confirms whether to proceed.
  - >5 drifted files → emit the finding and **block** scaffolding by default, with a single confirm prompt to override. Rationale: scaffolding into a heavily drifted branch produces low-quality knowledge; rebasing first is almost always the right move.
- Suggested action in every case: `Rebase onto origin/<base>, or git checkout origin/<base> -- <path> for a single-file pull-up; then re-run /project-branch-kickoff`.
- Honor `--no-preflight` to bypass entirely. The drift gate does not apply to `/project-branch-new` because the user is not yet on the new branch — drift is computed after the branch is created and on subsequent kickoff.

### 3. Big-project criteria check

Confirm the work qualifies as "big" by asking the user (preselect "yes" if any of the heuristics fire):

- expected to span >2 working days, **or**
- introduces a new pseudo-package or area, **or**
- changes ≥3 areas (api / cli / front-end / etc.), **or**
- migration / breaking change flagged.

If none match, recommend the lighter `/project-bootstrap` + `/scaffold-knowledge` pair instead and stop.

### 4. Model selection

Apply the model policy (see [Model policy](#model-policy)). Resolve the effective model from frontmatter default + user override, log the choice, and surface a fallback warning if the chosen model is unavailable.

### 5. Hand off to phases + knowledge

The calling command performs the actual work; this skill only documents the contract:

- For `/project-branch-new`: confirm-per-step git ops (`fetch`, `checkout <base>`, `pull --ff-only`, `checkout -b <new>`), then optionally chain into `/project-branch-kickoff`.
- For `/project-branch-kickoff`: run `/project-bootstrap` if no descriptor / state, else `/project-knowledge-refresh`; load `skills/plan-phases`; run `/scaffold-knowledge` (Dry-run first by default).

Each handoff is one user confirmation; do not bundle.

### 6. Mermaid policy

Apply the kit-wide mermaid policy (see `docs/PATH_CONTRACT.md` § Mermaid policy):

- `PHASES.md`: prompt with default ON when phases > 3.
- `MERGE_REQUEST.md`: prompt opt-in for migrations / multi-service refactors / schema changes.
- `LOG.md`: never auto-generate.
- `REVIEW.md`: prompt opt-in, default ON only when structural change is detected (new packages, multi-area diff, schema/route changes).
- All prompts include a one-line recommendation with rationale and preselect the recommended option.
- Honor `--no-mermaid` to skip every prompt.

Record the user's choice as a comment in the produced artifact (e.g. `<!-- mermaid: included on user opt-in -->`) so the decision is auditable.

### 7. Audit trail

Append, in order:

- A `LOG.md` block of the form:
  ```
  ### Kickoff <ISO timestamp>
  - command: /project-branch-new | /project-branch-kickoff
  - base: <base-branch>
  - new branch: <branch>
  - model: <selected> (fallback: <fallback or none>)
  - mermaid: phases=<bool> review=<bool> mr=<bool>
  - confirmations: <list of confirmed steps>
  ```
- An `## OpenCode:` block in `MERGE_REQUEST.md` with the same metadata, no PII, no raw user prompts; link to the first phase if `PHASES.md` exists.

Both writes happen atomically at the end of the flow; do not split metadata across separate writes.

### 8. Mode-switch suggestion (explicit)

At the end of kickoff, emit a short suggestion:

- Recommend `build` when kickoff completed (gates passed, phases drafted, discovery done) and the active phase is implementation-ready.
- Recommend `plan` when drift or unresolved scope/risk remains.
- Never auto-switch modes; require explicit user confirmation.

## Confirmation discipline

- Every git or file mutation gets a one-line preview followed by an explicit confirm.
- Aggregate confirms are allowed only for read-only sequences (`status`, `fetch --dry-run`, `log`).
- Provider-switch confirmations include a short note about potential context loss / billing / latency. Recommend staying on the session provider unless explicitly needed.

## Model policy

Default model resolution:

- **Upstream default:** unset. The command frontmatter leaves `model` empty; the active session model is used. The prompt mentions "kickoffs benefit from a high-reasoning model; pick your provider's top-tier reasoning model".
- **Fork default:** `claude-opus-4-7-thinking-xhigh` (set in fork-side command frontmatter; mirror layer rewrites).
- **Override prompt** (preselect default):
  - "Use default (recommended for kickoffs)"
  - "Pick another model" — opens free-form picker
  - "Keep current session model" — no subtask spawn
- **Fallback behavior:** if the chosen model is unavailable, emit a structured warning, document the fallback chain in the command response, and log the fallback in the `LOG.md` audit block.
- **Provider switch warning:** if the user picks a model from a different provider than the session, surface the warning explicitly. Recommendation = stay on the session provider unless explicitly needed.

## Permission default

The recommended `opencode.json` permission policy lists `branch-kickoff: ask`. Users see an explicit consent prompt the first time the skill is loaded in a session.

## Output format

Each step's outcome is summarized in a structured banner so the user can scan the run:

```
[branch-kickoff]
- safety: ok
- drift: 0 file(s)
- big-project criteria: 2 of 4 matched (multi-area, migration)
- model: <selected> (fallback: none)
- next: /project-bootstrap | /project-knowledge-refresh
```

If any step refuses or is declined, the banner ends with a `STATUS: aborted | declined | refused` line and the command halts.

## Anti-patterns to avoid

- **Auto-spawning subtasks without consent.** Frontmatter sets defaults; runtime overrides require an explicit prompt.
- **Bundling confirmations.** Each mutation gets its own one-line preview; long aggregate confirms hide intent.
- **Writing audit metadata at multiple times.** Audit writes are atomic at the end so a half-finished run is observable as "no audit entry yet".
- **Embedding raw user prompts in audit metadata.** Audit fields are structured (command name, base, branch, model, choices) and never include free-text user messages. See `docs/PATH_CONTRACT.md` § Security rules.

## Related

- Foundational primitive: `skills/git-safety/SKILL.md`.
- Senior reviewer / architect lens for adjacent flows: `skills/discover-knowledge`, `skills/plan-phases`, `skills/review-branch`.
- Baseline persona: `rules/SENIOR_ENGINEERING.md`.
- Commands wired in this plan: `commands/project-branch-new.md`, `commands/project-branch-kickoff.md`.
- Contract: `docs/PATH_CONTRACT.md` § Audit trail, § Mermaid policy, § Frontmatter conventions, § Security rules.
