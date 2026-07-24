# Changelog

Notable changes to OpenCode Conductor are recorded here.

## Unreleased

### Added

- Descriptor schema v3 helper registry with per-branch `HELPERS.json` selection.
- Compatibility adapter for descriptor schemas v1 and v2.
- Dry-run-first `bin/migrate-helper-registry.py` migration utility.
- Helper management through `/project-helper`.
- Explicit shared-branch reconciliation through `/project-pull-refresh`.
- Review lifecycle metadata, stable current/legacy finding handling, and review-driven change-request recommendations.
- Deterministic `reviewIgnoredPathGlobs` partitioning with reviewable/ignored counts and previews.
- Configurable `branchSyncStaleAfterMinutes`.
- Generic implementation commands for graph mutations, data-table columns, component extraction, existing flex-wrapper migrations, and browser end-to-end tests.
- Engineering skills for feature modules, graph query debugging, and browser testing.
- Artifact skills for visual design, document, spreadsheet, presentation, PDF, and animated GIF workflows.
- Central Python/Node dependency manifests with optional PDF-engine installation.
- Generic `project-rules/AGENTS.md` seed and explicit/interactive installer support.
- Behavioral contract suite in `tests/contract_checks.py`.

### Changed

- Standardized all Bun engine and wrapper sources under `tools-off/`.
- Installer now synchronizes commands, skills, rules, templates, project-rule seeds, runtime manifests, and tool sources.
- Installer safely seeds or merges `opencode.json`, preserving existing local/service values.
- Engine validates descriptor/helper paths and writes manifests atomically with restrictive permissions.
- Refresh is explicitly read-only and reports helper, review, narrative, and shared-branch state.
- Commands and rules remain model- and service-neutral.
- Documentation now treats schema v3 as current and v1/v2 as supported compatibility inputs.

### Compatibility

- Existing v1/v2 fixed helper fields continue to work.
- Existing branches without manifests implicitly track helper files already present.
- Existing review finding identifiers are preserved.
- Migration preserves fixed descriptor fields and never deletes helper files.

## 2.1.0

- Added descriptor-driven global and project-local state.
- Added source-tree-mirrored leaf knowledge and area guidance.
- Added branch kickoff, review, verification, knowledge, and help-documentation workflows.
- Added structured audit, Git safety, secret scanning, containment, and non-destructive scaffolding contracts.
- Split normative contract documentation from the human-oriented tutorial tree.
