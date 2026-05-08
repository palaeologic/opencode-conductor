---
title: Knowledge Maintenance
sidebar_position: 4
---

# Knowledge Maintenance

Commands that create, refresh, and curate durable knowledge across the project.

## `/scaffold-knowledge <projectKey> [list|dry-run]`

- **Purpose**: create or preview convention-path `AGENTS.md` files.
- **Frontmatter defaults**: `agent: plan`, `subtask: true`.

### Modes

- (default) — apply mode; writes new `AGENTS.md` files for areas/leaves not yet present.
- `list` — read-only enumeration.
- `dry-run` — preview proposed paths and contents without writing.

### Safety guards

- `invalid_package_name`
- `symlink_refused`
- `path_outside_root`
- `source_missing` (with `no-source-guard` opt-out)

### Worked example

```text
/scaffold-knowledge my-app dry-run

## Scaffold dry-run
- targets: <n>
- skipped: 1 (source_missing: api/v3/legacy)
- preview: <inline tree>
- next_step: rerun without dry-run to apply
```

## `/project-knowledge-refresh <projectKey>`

- **Purpose**: proposal-first knowledge refresh; emits proposed edits before mutating.
- **Frontmatter defaults**: `agent: plan`, `subtask: true`.

### Workflow

```mermaid
flowchart LR
  Run[/project-knowledge-refresh/] --> Drift[Drift preflight]
  Drift --> Diff[Diff against current AGENTS.md]
  Diff --> Proposal[Emit proposal block]
  Proposal --> Approve{User approves?}
  Approve -- yes --> Write[Apply edits]
  Approve -- no --> Stop[No-op]
  Write --> Audit[Append LOG.md and MR audit]
```

### Worked example

```text
/project-knowledge-refresh my-app

## Knowledge refresh proposal
- area: frontend
- leaves to update: 2
- new sections: ## Verification scripts (frontend)
- drift: F-12 stale frontend AGENTS.md vs origin/main
```

## `/project-cleanup-candidates <projectKey>`

- **Purpose**: read-only report of candidate stale folders/files.
- **When to use**: after large refactors, when leaf paths might no longer reflect source.

## Recommended cadence

```mermaid
gantt
  dateFormat YYYY-MM-DD
  title Knowledge maintenance cadence
  section Per branch
  Drift preflight       :a1, 2026-01-01, 1d
  Scaffold (when new pkg) :a2, after a1, 1d
  Knowledge refresh     :a3, after a2, 1d
  section Per release
  Cleanup candidates    :b1, 2026-01-08, 1d
```

## How knowledge feeds review

The structured-knowledge tables you maintain here drive `/project-review`'s deterministic verification suggestions — see [review-and-mr](./review-and-mr.md).
