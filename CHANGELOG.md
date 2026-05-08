# Changelog

All notable changes to this kit are documented here. This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style.

## [Unreleased]

### Changed - Docs split (docusaurus + documentation)

- Replaced ambiguous `docs/` tree with two top-level namespaces: [`/documentation/`](documentation/) for terse contract MDs and [`/docusaurus/`](docusaurus/) for the substantive, diagram-rich user manual.
- Moved root-level operator MDs into `/documentation/`: `WORKFLOW.md`, `COMMAND_WORKFLOW.md`, `TEST_PLAN.md`, `CHANGELOG-v2.md`, `PATH_CONTRACT.md`, `UPGRADING.md`, `ROADMAP.md`.
- Added new contract docs in `/documentation/`: [`TESTING_THE_KIT.md`](documentation/TESTING_THE_KIT.md), [`EXTENDING.md`](documentation/EXTENDING.md), and [`FAQ.md`](documentation/FAQ.md).
- Filled the user manual: substantive `intro.md`, command catalog with per-family pages, skill catalog with per-skill pages, knowledge system with worked examples and structured-knowledge tables, scenario walkthroughs, descriptor reference, and a 10-page session-distilled FAQ.
- Added tutorial pages [`docusaurus/contributing/testing-the-kit.md`](docusaurus/contributing/testing-the-kit.md) and [`docusaurus/contributing/extending.md`](docusaurus/contributing/extending.md).
- Removed the entire previous `docs/` tree, including the redundant `docs/docusaurus/` wrapper. Removed `docs/presentations/` (no longer maintained).
- Rewrote internal links across `commands/`, `skills/`, `README.md`, and `CHANGELOG.md` to the new paths. No remaining `docs/` references in tracked files.

### Changed — Docs consolidation for Docusaurus entry

- Added canonical Docusaurus namespace at [`docusaurus/`](docusaurus/) to reduce entry-point ambiguity and avoid duplicate onboarding text across doc indices.
- Added descriptor reference page at [`docusaurus/descriptors/descriptor-json.md`](docusaurus/descriptors/descriptor-json.md) with schema-v2 examples and field-by-field guidance.
- Slimmed [`docusaurus/intro.md`](docusaurus/intro.md) into a pointer page so `docusaurus/index.md` remains the single publishing entry.

### Added — Help-docs authoring skill (Plan 5)

- Added [`skills/help-docs-author/SKILL.md`](skills/help-docs-author/SKILL.md) with the five-phase authoring workflow (Discovery -> Code-reading -> Plan -> Generation -> Audit) for generating end-user help-center documentation from source code.
- Added [`commands/project-help-docs.md`](commands/project-help-docs.md) with argumentized output root/scope handling, output containment checks, in-repo refusal by default, and opt-out flags (`--no-frontmatter`, `--no-mermaid`, `--no-vocab-grep`, `--allow-in-repo`).
- Added Docusaurus docs section [`docusaurus/help-docs-authoring/`](docusaurus/help-docs-authoring/) and updated workflow/command/test docs for command discoverability and verification.

### Added — Kit Docusaurus restructure (Plan 4)

- Added Docusaurus entry page [`docusaurus/intro.md`](docusaurus/intro.md) and categorized docs sections for workflows, commands, contributing, skills, and knowledge (`_category_.yml` + landing pages).
- Added architecture documentation set in [`docusaurus/architecture/`](docusaurus/architecture/) with ten focused pages: mental model, components, data flow, lifecycles, core sequences, extension points, invariants, security model, trade-offs, and failure modes.
- Added at least one mermaid diagram per architecture page to make system behavior and constraints easier to communicate to both engineers and technical leads.
- Updated root [`README.md`](README.md) docs map to include the Docusaurus docs entry and architecture section.

### Added — Branch explore guide (Plan 3)

- [`commands/project-branch-explore.md`](commands/project-branch-explore.md) — advisory branch exploration command: confirmed branch switch, read-only context gathering, and `EXPLORE_GUIDE.md` generation (`Setup`, `What's new`, `How to try it`, `Caveats`) with no browser automation and no auto-run setup.
- [`skills/branch-explore/SKILL.md`](skills/branch-explore/SKILL.md) — guide-synthesis lens that prioritizes MR narrative, commit history, code comments, and dependency diffs; outputs deterministic manual exploration steps.
- [`commands/project-state.md`](commands/project-state.md) — read-only kit-state command (working tree, HEAD/base divergence, optional drift summary, kit stashes, recent kickoff audit entries), with `verbose` and `no-preflight` flags.
- Docs/test coverage for Plan 3 in [`README.md`](README.md), [`documentation/WORKFLOW.md`](documentation/WORKFLOW.md), [`documentation/COMMAND_WORKFLOW.md`](documentation/COMMAND_WORKFLOW.md), [`documentation/TEST_PLAN.md`](documentation/TEST_PLAN.md), and roadmap status in [`documentation/ROADMAP.md`](documentation/ROADMAP.md).

### Added — Verification-scripts knowledge (Plan 2)

- Deterministic verification synthesis in [`commands/project-review.md`](commands/project-review.md): suggested verifications are now derived from area-level `## Verification scripts` tables (`Trigger | Command | When`) by matching triggers against `git diff --name-only`, with dedupe preserving first-seen order.
- Missing-block finding in review: when a changed area lacks `## Verification scripts`, `/project-review` emits one `F-xx` note-level finding with suggested action to scaffold/add the block; generic fallback suggestions remain available.
- Starter verification-table scaffold in [`commands/scaffold-knowledge.md`](commands/scaffold-knowledge.md): new area-level `AGENTS.md` templates now include a minimal `## Verification scripts` block so teams have a deterministic starting point.
- Script-manifest awareness in [`commands/project-knowledge-refresh.md`](commands/project-knowledge-refresh.md): proposals now include refreshing area verification tables when script manifests change (`package.json`, `pyproject.toml`, `requirements.txt`, `Makefile`, `Justfile`, etc.).
- Pre-write secret-scan enforcement documented in refresh workflow: approved durable writes must run the regex-based secret scan from [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) before writing.

### Added — Branch Kickoff Commands (Plan 1, Phase C1)

- [`commands/project-branch-new.md`](commands/project-branch-new.md) — create a new branch from the latest integration base, with `git-safety` preflight, fixed read-only shell injections (status / HEAD / origin/HEAD anchors), per-step git confirmations (`fetch` / `checkout <base>` / `pull --ff-only` / `checkout -b <new>`), model-selection prompt with provider warning, optional chain into `/project-branch-kickoff`, and structured audit trail (`LOG.md` + MR `## OpenCode:` block). Positional `$1` for branch name skips the prompt. Frontmatter: `subtask: false` (kickoff stays in primary context for audit). Upstream model unset; fork sets `claude-opus-4-7-thinking-xhigh` at mirror time.
- [`commands/project-branch-kickoff.md`](commands/project-branch-kickoff.md) — scaffold a big project on a fresh / empty feature branch: `git-safety` preflight, branch-readiness gate (refuse on `main`/`master`; confirm on commits-ahead), drift gate (silent on 0; finding on 1–5; block-with-confirm on >5), big-project criteria check, then orchestrates `/project-bootstrap` or `/project-knowledge-refresh` → `skills/plan-phases` → `/scaffold-knowledge dry-run` → `/scaffold-knowledge discovery`. Honors `no-preflight` / `no-stash-check` / `no-source-guard` / `no-mermaid` opt-outs (composable). Audit trail per kit-wide contract.

### Added — Branch Kickoff Foundation (Plan 1, Phases F1–F3)

- [`skills/git-safety/SKILL.md`](skills/git-safety/SKILL.md) — standalone safety primitive: refuse-on-dirty preflight, attached-HEAD check, base-branch resolution (`origin/HEAD` → `main` → `master`), kit-stash naming convention (`opencode-kit:<command>:<original-branch>:<iso-timestamp>`), reminder hook with cross-check warning. Never auto-stashes; never loads other skills. Recommended permission: `ask`.
- [`skills/branch-kickoff/SKILL.md`](skills/branch-kickoff/SKILL.md) — kickoff orchestration (loads `git-safety`); covers drift gate, big-project criteria, model selection policy, mermaid policy, audit trail (`LOG.md` + MR `## OpenCode:` block), confirmation discipline. Commands wire in C1 (Plan 1 commands phase).
- [`opencode.json.example`](opencode.json.example) — vendor-neutral `permission.skill` policy: `git-safety: ask`, `branch-kickoff: ask`, others `allow`. Plan-mode override relaxes `git-safety` to `allow`. Copy / merge into real `~/.config/opencode/opencode.json`.
- **Knowledge-drift preflight** in [`commands/project-knowledge-refresh.md`](commands/project-knowledge-refresh.md) and [`commands/project-review.md`](commands/project-review.md) — silent default; resolves base via `origin/HEAD` → `main` → `master`; fetches read-only with **5-minute fixed session cache**; computes AGENTS.md symmetric diff vs base; emits `F-xx` "Knowledge drift vs base" finding with rebase / single-file pull-up suggestion; project-local mode skipped; `no-preflight` opt-out.
- **Source-path existence guard** in [`commands/scaffold-knowledge.md`](commands/scaffold-knowledge.md) and [`skills/discover-knowledge/SKILL.md`](skills/discover-knowledge/SKILL.md) — leaves whose source directory is missing on the current branch are classified `skipped` with `source_missing` and not written; prevents "ghost knowledge" in project-local mode; `no-source-guard` opt-out.
- **Mermaid policy** in [`commands/project-review.md`](commands/project-review.md), [`commands/project-phases.md`](commands/project-phases.md), [`commands/project-update-mr.md`](commands/project-update-mr.md) — review opt-in with structural-change default ON, phases default ON when phases > 3, MR opt-in for architectural / migration MRs; `no-mermaid` opt-out kit-wide. Choices recorded as HTML comments in artifacts; mermaid never inside `## OpenCode:` blocks.
- **Structured-knowledge-table schema** in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) — `Trigger` / `Command` / `When` columns; consumed by future verification-script and run-locally tables; literal command strings only (no `$ARGUMENTS`).
- **Frontmatter conventions** in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) — table covering kickoff / review-advisory / read-only / bootstrap-refresh defaults for `agent`, `subtask`, `model`. Replaces ad-hoc runtime model prompts.
- **Security rules** in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) — no user-prompt text in audit logs; no `$ARGUMENTS` inside `!` shell-injection blocks; structured stash messages only; no skill recursion (single exception: `git-safety` as foundational primitive); provider-switch trust boundary; pre-write secret scan (extended in Plan 2); output containment.
- **Kit-stash convention** documented in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) (full detail in `skills/git-safety/SKILL.md`).
- **Knowledge across branches** in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) and [`documentation/WORKFLOW.md`](documentation/WORKFLOW.md) §12 — storage modes table, drift behavior, source-path guard pitfalls in project-local mode, `AGENTS.md` merge-conflict playbook with worked example, decision flow diagram.
- **Audit trail contract**, **mermaid policy table**, **positional-argument support**, **opt-out flags** documented in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md).

### Added — earlier in this release cycle

- [`documentation/ROADMAP.md`](documentation/ROADMAP.md) — captures deferred ideas (`kitVersion` field, descriptor-from-repo engine work, descriptor-driven path guard, governance template). Items are graduated into `[Unreleased]` here when they become active work.
- **`descriptorSchemaVersion: 2`** — `pseudoPackageDetection` is now an **array of rules** so a single project can declare multiple detection strategies per area. Two `kind`s ship: `pathAndAlias` and `pathPrefix`. Legacy object form is normalized to a single-element array on read; deprecated for one minor release. See [`documentation/UPGRADING.md`](documentation/UPGRADING.md) for migration steps.
- **Source-tree-mirror convention for leaf `AGENTS.md`** — leaf knowledge lives at `<opencodeProjectRootPath>/<rel>/AGENTS.md` where `<rel>` mirrors the leaf's path under `projectRootPath`. Stem derivation contract, disambiguation rules, and safety guardrails (package name regex, root containment, symlink refusal, non-destructive writes) documented in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md).
- **`/scaffold-knowledge` discovery / list / dry-run modes** — re-running the command auto-detects untracked leaves under `pseudoPackageDetection` rules and writes sparse scaffolds at the convention path. No JSON edits needed for new packages. List + dry-run modes never write.
- **Knowledge preflight in `/project-review`** — silent default; auto-scaffolds missing leaf `AGENTS.md` for changed leaves, flags stale ones via a **deterministic git-based heuristic** (no `mtime`), and emits a structured `## Preflight summary` at the top of `REVIEW.md`. Audit lines append to branch `LOG.md`. Pass `no-preflight` in `$ARGUMENTS` to skip.
- [`rules/SENIOR_ENGINEERING.md`](rules/SENIOR_ENGINEERING.md) — small, vendor-neutral always-on rule establishing a Senior Developer + Engineer + Architect baseline. Opt-out via `instructions` in `opencode.json`.
- [`skills/discover-knowledge/SKILL.md`](skills/discover-knowledge/SKILL.md) — Senior Architect lens for `/scaffold-knowledge`, `/project-knowledge-refresh`, and the review preflight; carries the **knowledge promotion rubric**.
- [`skills/plan-phases/SKILL.md`](skills/plan-phases/SKILL.md) — Senior Architect / PM lens for `PHASES.md` authoring, with phase template, sizing heuristics, and anti-patterns.
- [`documentation/WORKFLOW.md`](documentation/WORKFLOW.md) §11 (Knowledge-aware review preflight) and §12 (three worked examples — function Q&A, end-to-end review with preflight, adding a new package later); two new Mermaid flowcharts.

### Changed

- [`skills/review-branch/SKILL.md`](skills/review-branch/SKILL.md) — extended with a **Senior Reviewer lens** (correctness, security, maintainability, performance, architecture impact, DX / blast radius, knowledge alignment).
- [`commands/project-knowledge-refresh.md`](commands/project-knowledge-refresh.md) — now reads both convention-path leaf files **and** `sharedPackageKnowledge` overrides; embeds the knowledge promotion rubric.
- [`commands/scaffold-knowledge.md`](commands/scaffold-knowledge.md) — modes (discovery / list / dry-run); idempotent re-runs; loads the `discover-knowledge` skill.
- [`commands/project-review.md`](commands/project-review.md) — adds step 1.5 knowledge preflight; loads `review-branch` and `discover-knowledge` skills.
- [`commands/project-phases.md`](commands/project-phases.md) and [`commands/project-bootstrap.md`](commands/project-bootstrap.md) — load `plan-phases` skill when authoring or refining `PHASES.md`.
- [`README.md`](README.md) — refreshed **Token cost analysis** for post-v2.1 footprint, added **Knowledge audience** note to descriptor / workflow guidance, updated rules table + `instructions` example, added new "Use cases" rows.

### Notes for consumers

- `descriptor.json` is **backward compatible**: omit `descriptorSchemaVersion` and keep `pseudoPackageDetection` as an object — commands normalize on read. Migrating to `descriptorSchemaVersion: 2` is recommended; the legacy form is deprecated.
- After `git pull`, re-run `bash bin/install-opencode-conductor.sh` from this clone.
- If you adopt the new `SENIOR_ENGINEERING.md` rule, add it to the `instructions` array in your `opencode.json`. Always-on cost is small (~600 tokens).
- The new `git-safety` and `branch-kickoff` skills default to `permission.skill: ask`. Copy [`opencode.json.example`](opencode.json.example) into your real `~/.config/opencode/opencode.json` to enable the recommended policy.
- All new gates (drift preflight, source-path guard, mermaid prompts) are silent or opt-in by default and ship with `no-*` opt-out flags for CI / batch flows. See [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) § Opt-out flags.

### Foundation release notes (F1–F3)

The Branch Kickoff Foundation phases land the kit-wide primitives (skills, safety preflight, drift / source-path / mermaid gates, schema, conventions, security rules, recommended permission policy) **without** user-facing kickoff commands. The two kickoff commands (`/project-branch-new`, `/project-branch-kickoff`) ship in the next phase (C1) and consume these primitives.

Why ship foundation first:

- **Smaller blast radius** per push; each phase verifies independently.
- **Existing commands gain the gates** immediately: `/project-review` and `/project-knowledge-refresh` get the drift preflight; `/scaffold-knowledge` gets the source-path guard; `/project-review`, `/project-phases`, `/project-update-mr` get the mermaid policy. No new user commands needed to benefit.
- **`opencode.json.example`** lets users adopt the recommended permission policy at their own pace.
- **`documentation/PATH_CONTRACT.md`** becomes the single source of truth for schema, conventions, security rules, mermaid policy, audit trail contract, kit-stash convention, and knowledge-across-branches modes.

Backwards compatibility: every gate is silent on no-finding and ships with an opt-out flag. Existing flows are unchanged unless drift / missing source / structural change is actually detected.

### Commands release notes (C1)

Phase C1 lands the two user-facing kickoff commands on top of the foundation:

- **`/project-branch-new`** is the entry point when the user is on any branch (typically `main`/`master`) and wants a brand-new branch off the latest integration base. It owns the per-step git confirmations (`fetch` → `checkout <base>` → `pull --ff-only` → `checkout -b <new>`) so the agent never silently mutates git state. It can chain into `/project-branch-kickoff` for the full scaffold, or stop after the audit step if the work does not match the big-project criteria.
- **`/project-branch-kickoff`** is the entry point when the user is already on a fresh / empty feature branch. It owns the drift gate, big-project criteria check, model selection, and orchestration of `/project-bootstrap` / `/project-knowledge-refresh` → `skills/plan-phases` → `/scaffold-knowledge` (dry-run then discovery).

Both commands set `subtask: false` because the kickoff session is the audit unit; we explicitly want the LOG / MR audit blocks to be appended in the same context window the user is observing. Upstream leaves `model` unset so consumers can configure their own; the fork wires top-tier reasoning at mirror time.

Trade-off: fewer kickoff calls per session keeps audit blocks atomic, but it means more state lives in the primary context during a long kickoff. We accept that cost in exchange for transparent audit. If the cost becomes an issue, a future plan can split the orchestrator into a thin command + heavyweight subtask that returns a structured audit blob.

## [v2.1.0] - 2026-05-07

### Added

- [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) — documents how Bun tools resolve `descriptor.json` vs `branchHandoff` paths (Phase 0 contract).
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting stub plus operator checklist for handoff markdown and git.
- [`documentation/UPGRADING.md`](documentation/UPGRADING.md) — migration and “stale clone” catch-up guidance.
- **`/project-init`** flow now supports **global vs project-local** durable state, optional **`.gitignore`** tri-state for repo-local dirs, and a **locked** repo-local path layout (see PATH_CONTRACT).

### Changed

- **README**, **WORKFLOW**, **bin/README**, and several **commands** now describe paths as **descriptor-driven** (with one canonical `~/.config/...` example where helpful) instead of implying all data always lives under `~/.config`.
- **Descriptor template** — optional `conductorStateLocation` / `localStateDirname` keys for documentation.
- **`/project-update-mr`** and **`/project-review-sync`** prompts now render the A/B/C/D menu as a literal fenced block with a `do not paraphrase` instruction so the TUI cannot drop or rename options.

### Notes for consumers

- After `git pull`, re-run `bash bin/install-opencode-conductor.sh` from this clone.
- `descriptor.json` remains at `~/.config/opencode/projects/<projectKey>/descriptor.json`; project-local mode moves **handoff + AGENTS** paths into the repo per that file (see UPGRADING).
