# Changelog

All notable changes to this kit are documented here. This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style.

## [Unreleased]

### Added

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — captures deferred ideas (`kitVersion` field, descriptor-from-repo engine work, descriptor-driven path guard, governance template). Items are graduated into `[Unreleased]` here when they become active work.

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
