# FAQ (contract)

Terse Q/A index. Categories mirror `docusaurus/faq/`. For prose, examples, and diagrams see the matching page in `docusaurus/faq/<category>.md`.

## getting-started

- **Q:** How do I install the kit on a project?
  **A:** Run `bash bin/install-opencode-conductor.sh` against your repo, then `/project-init <projectKey>`.
- **Q:** Global vs project-local state — which?
  **A:** Default global. Use project-local only when isolation matters; bump `descriptorSchemaVersion` accordingly.
- **Q:** What does `/project-init` do?
  **A:** Scans the repo, drafts `descriptor.json`, seeds `_templates/` and `AGENTS.md` after approval.

## knowledge-system

- **Q:** When does knowledge discovery happen?
  **A:** During `/scaffold-knowledge`, on `/project-bootstrap`, on `/project-knowledge-refresh`, and inside `/project-review` when stale.
- **Q:** Is `AGENTS.md` for agents only?
  **A:** No — dual-audience. Sections are tagged for human reading vs agent processing.
- **Q:** What if `<area>/packages/<pkg>` does not match my repo?
  **A:** Use `pseudoPackageDetection` rules to map your real layout to the convention paths.
- **Q:** How do I add behaviors for tracked packages?
  **A:** Add structured-knowledge tables to area-level `AGENTS.md` (Verification scripts, Run locally).
- **Q:** What about branch divergence on master?
  **A:** Knowledge-drift preflight emits `F-xx` findings; pull up single files or rebase.

## big-project-kickoff

- **Q:** How do I start a big project on a fresh branch?
  **A:** `/project-branch-new` then `/project-branch-kickoff`.
- **Q:** Difference between `/project-branch-new` and `/project-branch-kickoff`?
  **A:** New = git ops. Kickoff = bootstrap or refresh, plan-phases, scaffold.
- **Q:** Can I avoid copy-pasting prompts?
  **A:** Yes — kickoff command runs the canonical prompt for you.
- **Q:** Can I spawn a subtask with a specific model?
  **A:** Yes — kickoff prompts you to pick a model and spawns a subtask with it.

## reviews-and-verification

- **Q:** How does `/project-review` choose verifications?
  **A:** Reads area `## Verification scripts` tables, matches diff via globs and qualifiers.
- **Q:** Why didn't it suggest `setup-lint`?
  **A:** No matching trigger row for the changed path. Add a row.
- **Q:** What is `F-xx`?
  **A:** Finding id used in REVIEW.md tables; preflight emits `F-xx` for missing-block and drift cases.
- **Q:** What is the knowledge-drift preflight?
  **A:** Diffs `AGENTS.md` files vs base branch and flags stale knowledge before review.
- **Q:** When does mermaid get added to REVIEW.md / PHASES.md / MERGE_REQUEST.md?
  **A:** Opt-in prompts: review = opt-in; phases > 3 prompts; MR = opt-in.

## branch-explore

- **Q:** How do I try a feature branch in the browser?
  **A:** `/project-branch-explore <branch>` writes `EXPLORE_GUIDE.md` with URL, actions, and setup deps. No browser automation.
- **Q:** What is `EXPLORE_GUIDE.md`?
  **A:** Per-branch ephemeral guide with `## Setup`, `## What's new`, `## How to try it`, `## Caveats`.
- **Q:** Will the kit auto-run installs?
  **A:** No — it suggests `bun install` / `pip install` based on lockfile diffs but does not execute.

## skills-vs-commands-vs-rules

- **Q:** What is a skill?
  **A:** A loadable lens an agent can invoke; defined by `skills/<name>/SKILL.md`. Reference: opencode.ai/docs/skills.
- **Q:** Is `git-safety` only a skill?
  **A:** Yes; invoked indirectly by mutating commands. The user-facing entry is `/project-state`.
- **Q:** When are rules vs skills loaded?
  **A:** Rules are always-on; skills are loaded by the agent on demand.
- **Q:** Why `permission.skill: ask` for some skills?
  **A:** Mutating skills should require explicit consent; non-mutating may be `allow`.

## model-routing-and-cost

- **Q:** Recommended model for kickoff?
  **A:** Latest reasoning-capable model your provider offers; the command prompts a choice.
- **Q:** Does the v2 cost analysis still hold?
  **A:** Yes; v2.1 added structured-knowledge tables that reduce review iteration cost.
- **Q:** `subtask: true` vs `false`?
  **A:** True for read-mostly delegation; false when primary-context audit is required.
- **Q:** How do `subtaskModels` work?
  **A:** Per-command override map; selected at command run-time when present.

## mermaid-and-audit

- **Q:** When should I include mermaid?
  **A:** PHASES.md by default for >3 phases, REVIEW.md and MERGE_REQUEST.md opt-in.
- **Q:** What is the audit trail contract?
  **A:** Mutating commands append `### <Activity>` to LOG.md and refresh `## OpenCode:` in MR.
- **Q:** What is the kit-stash convention?
  **A:** `git stash push -m "kit-stash:<command>:<ref>"` so reminders can fire on branch return.

## vendor-neutrality-and-fork

- **Q:** Why upstream-first?
  **A:** Generic improvements stay in `opencode-conductor`; forks adopt them.
- **Q:** Why does the fork exist?
  **A:** Vendor-specific overrides, models, ban-lists, and integrations.
- **Q:** What goes upstream vs fork-only?
  **A:** Generic = upstream; brand- or domain-specific = fork.
- **Q:** How do I bump `Tracks upstream:`?
  **A:** Update the README pointer to the new upstream short SHA after mirroring.

## help-docs-authoring

- **Q:** What does `/project-help-docs` do?
  **A:** Generates end-user help docs from code via a five-phase workflow.
- **Q:** Why refuse in-repo writes?
  **A:** Avoid contaminating the repo with downstream docs by accident; pass `--allow-in-repo` to opt in.
- **Q:** What is the vocabulary ban-list?
  **A:** Configurable list of forbidden terms checked post-generation; pass `--ban-term` or rely on the fork's preloaded defaults.
- **Q:** How do I ship to a docs site?
  **A:** Point `--output-root` at a separate site repo or pipeline artifact path.
