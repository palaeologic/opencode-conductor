# Changelog

All notable changes to this kit are documented here. This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style.

## [Unreleased]

### Added

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — captures deferred ideas (`kitVersion` field, descriptor-from-repo engine work, descriptor-driven path guard, governance template). Items are graduated into `[Unreleased]` here when they become active work.
- **`descriptorSchemaVersion: 2`** — `pseudoPackageDetection` is now an **array of rules** so a single project can declare multiple detection strategies per area. Two `kind`s ship: `pathAndAlias` and `pathPrefix`. Legacy object form is normalized to a single-element array on read; deprecated for one minor release. See [`docs/UPGRADING.md`](docs/UPGRADING.md) for migration steps.
- **Source-tree-mirror convention for leaf `AGENTS.md`** — leaf knowledge lives at `<opencodeProjectRootPath>/<rel>/AGENTS.md` where `<rel>` mirrors the leaf's path under `projectRootPath`. Stem derivation contract, disambiguation rules, and safety guardrails (package name regex, root containment, symlink refusal, non-destructive writes) documented in [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md).
- **`/scaffold-knowledge` discovery / list / dry-run modes** — re-running the command auto-detects untracked leaves under `pseudoPackageDetection` rules and writes sparse scaffolds at the convention path. No JSON edits needed for new packages. List + dry-run modes never write.
- **Knowledge preflight in `/project-review`** — silent default; auto-scaffolds missing leaf `AGENTS.md` for changed leaves, flags stale ones via a **deterministic git-based heuristic** (no `mtime`), and emits a structured `## Preflight summary` at the top of `REVIEW.md`. Audit lines append to branch `LOG.md`. Pass `no-preflight` in `$ARGUMENTS` to skip.
- [`rules/SENIOR_ENGINEERING.md`](rules/SENIOR_ENGINEERING.md) — small, vendor-neutral always-on rule establishing a Senior Developer + Engineer + Architect baseline. Opt-out via `instructions` in `opencode.json`.
- [`skills/discover-knowledge/SKILL.md`](skills/discover-knowledge/SKILL.md) — Senior Architect lens for `/scaffold-knowledge`, `/project-knowledge-refresh`, and the review preflight; carries the **knowledge promotion rubric**.
- [`skills/plan-phases/SKILL.md`](skills/plan-phases/SKILL.md) — Senior Architect / PM lens for `PHASES.md` authoring, with phase template, sizing heuristics, and anti-patterns.
- [`WORKFLOW.md`](WORKFLOW.md) §11 (Knowledge-aware review preflight) and §12 (three worked examples — function Q&A, end-to-end review with preflight, adding a new package later); two new Mermaid flowcharts.

### Changed

- [`skills/review-branch/SKILL.md`](skills/review-branch/SKILL.md) — extended with a **Senior Reviewer lens** (correctness, security, maintainability, performance, architecture impact, DX / blast radius, knowledge alignment).
- [`commands/project-knowledge-refresh.md`](commands/project-knowledge-refresh.md) — now reads both convention-path leaf files **and** `sharedPackageKnowledge` overrides; embeds the knowledge promotion rubric.
- [`commands/scaffold-knowledge.md`](commands/scaffold-knowledge.md) — modes (discovery / list / dry-run); idempotent re-runs; loads the `discover-knowledge` skill.
- [`commands/project-review.md`](commands/project-review.md) — adds step 1.5 knowledge preflight; loads `review-branch` and `discover-knowledge` skills.
- [`commands/project-phases.md`](commands/project-phases.md) and [`commands/project-bootstrap.md`](commands/project-bootstrap.md) — load `plan-phases` skill when authoring or refining `PHASES.md`.
- [`README.md`](README.md) — refreshed **Token cost analysis** for post-v2.1 footprint, added **Knowledge audience** note to descriptor / workflow guidance, updated rules table + `instructions` example, added new "Use cases" rows.
- [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md), [`docs/UPGRADING.md`](docs/UPGRADING.md), [`COMMAND_WORKFLOW.md`](COMMAND_WORKFLOW.md), [`TEST_PLAN.md`](TEST_PLAN.md), [`docs/presentations/README.md`](docs/presentations/README.md), and [`descriptors/descriptor.template.json`](descriptors/descriptor.template.json) updated for the schema, convention path, preflight, skills, and senior rule.

### Notes for consumers

- `descriptor.json` is **backward compatible**: omit `descriptorSchemaVersion` and keep `pseudoPackageDetection` as an object — commands normalize on read. Migrating to `descriptorSchemaVersion: 2` is recommended; the legacy form is deprecated.
- After `git pull`, re-run `bash bin/install-opencode-conductor.sh` from this clone.
- If you adopt the new `SENIOR_ENGINEERING.md` rule, add it to the `instructions` array in your `opencode.json`. Always-on cost is small (~600 tokens).

## [v2.1.0] - 2026-05-07

### Added

- [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md) — documents how Bun tools resolve `descriptor.json` vs `branchHandoff` paths (Phase 0 contract).
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting stub plus operator checklist for handoff markdown and git.
- [`docs/UPGRADING.md`](docs/UPGRADING.md) — migration and “stale clone” catch-up guidance.
- **`/project-init`** flow now supports **global vs project-local** durable state, optional **`.gitignore`** tri-state for repo-local dirs, and a **locked** repo-local path layout (see PATH_CONTRACT).

### Changed

- **README**, **WORKFLOW**, **bin/README**, and several **commands** now describe paths as **descriptor-driven** (with one canonical `~/.config/...` example where helpful) instead of implying all data always lives under `~/.config`.
- **Descriptor template** — optional `conductorStateLocation` / `localStateDirname` keys for documentation.
- **`/project-update-mr`** and **`/project-review-sync`** prompts now render the A/B/C/D menu as a literal fenced block with a `do not paraphrase` instruction so the TUI cannot drop or rename options.

### Notes for consumers

- After `git pull`, re-run `bash bin/install-opencode-conductor.sh` from this clone.
- `descriptor.json` remains at `~/.config/opencode/projects/<projectKey>/descriptor.json`; project-local mode moves **handoff + AGENTS** paths into the repo per that file (see UPGRADING).
